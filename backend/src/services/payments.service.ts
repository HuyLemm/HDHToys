import { Prisma, type PaymentReconciliationStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { badRequest } from "../errors/HttpError.js"
import { PAYMENT_SYSTEM_STAFF_EMAIL } from "../lib/paymentConfig.js"
import * as ordersService from "./orders.service.js"

// Mã đơn hàng dạng HDH-{năm}-{5 số} — dùng để trích mã đơn từ nội dung
// chuyển khoản khi đối soát (SRS FR-PAY.3). Cờ "g" để phát hiện được nếu nội
// dung chứa NHIỀU mã khác nhau (VD khách để lại ghi chú cũ trong app ngân
// hàng) — khi đó không đoán bừa lấy mã đầu tiên mà coi là không đọc được,
// tránh gán nhầm tiền cho sai đơn.
const ORDER_CODE_PATTERN = /HDH-\d{4}-\d{5}/g

let systemStaffIdCache: string | null = null

/**
 * Tài khoản Staff đại diện hệ thống, dùng làm nguoiTaoId/nguoiThucHienId cho
 * các bản ghi (Invoice, InventoryTransaction) do webhook tự tạo — vì hai cột
 * này là FK bắt buộc (NOT NULL) tới Staff trong schema hiện tại (xem SDS mục
 * 5.8 điểm 3). Tài khoản này được seed sẵn ở trạng thái LOCKED, không đăng
 * nhập được.
 */
async function getSystemStaffId(): Promise<string> {
  if (systemStaffIdCache) return systemStaffIdCache
  const staff = await prisma.staff.findUnique({ where: { email: PAYMENT_SYSTEM_STAFF_EMAIL } })
  if (!staff) {
    throw badRequest("Chưa có tài khoản hệ thống cho thanh toán tự động — chạy lại `npm run seed` để tạo.")
  }
  systemStaffIdCache = staff.id
  return staff.id
}

export interface WebhookPayload {
  referenceCode: string
  transferAmount: number
  content: string
  gateway?: string
  transactionDate?: string
  accountNumber?: string
  description?: string
}

export async function recordAndReconcile(payload: WebhookPayload) {
  // Idempotency (FR-PAY.6/NFR-10): maGiaoDichNganHang là unique constraint —
  // nếu đã tồn tại, đây là webhook gửi lại (at-least-once delivery), không
  // xử lý/đối soát lần 2.
  const existing = await prisma.paymentTransaction.findUnique({ where: { maGiaoDichNganHang: payload.referenceCode } })
  if (existing) {
    return { duplicate: true, transaction: existing }
  }

  const distinctMatches = new Set(payload.content.match(ORDER_CODE_PATTERN) ?? [])
  const orderCode = distinctMatches.size === 1 ? [...distinctMatches][0] : null
  const order = orderCode ? await prisma.order.findUnique({ where: { ma: orderCode } }) : null
  const orderIsPending =
    !!order && (order.trangThai === "MOI" || order.trangThai === "DANG_XU_LY") && order.phuongThucThanhToan === "QR_CODE"

  let trangThaiDoiSoat: PaymentReconciliationStatus
  let matchedOrderId: string | null = null

  // Số tiền cần khớp là phần CÒN LẠI sau khi trừ cọc đã nhận trước đó (giống
  // hệt getQrPaymentInfo bên orders.service.ts) — không phải luôn tongCong,
  // nếu không đơn có cọc sẽ không bao giờ khớp khi khách chuyển đúng phần còn thiếu.
  if (!order || !orderIsPending) {
    trangThaiDoiSoat = "KHONG_KHOP"
  } else if (order.tongCong - order.tienCoc !== payload.transferAmount) {
    trangThaiDoiSoat = "SAI_SO_TIEN"
    matchedOrderId = order.id
  } else {
    trangThaiDoiSoat = "KHOP"
    matchedOrderId = order.id
  }

  // Lưu vết mọi giao dịch nhận qua webhook, kể cả không đối soát được (FR-PAY.8).
  let transaction: Awaited<ReturnType<typeof prisma.paymentTransaction.create>>
  try {
    transaction = await prisma.paymentTransaction.create({
      data: {
        maGiaoDichNganHang: payload.referenceCode,
        orderId: matchedOrderId,
        soTienNhan: payload.transferAmount,
        noiDungChuyenKhoan: payload.content,
        trangThaiDoiSoat,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    // Race hiếm: 2 lượt gửi webhook trùng referenceCode lọt qua check "đã tồn
    // tại" ở trên gần như đồng thời (TOCTOU) — người thua cuộc vi phạm unique
    // constraint (P2002) thay vì đọc được bản ghi người thắng vừa tạo. Không
    // để lỗi này thoát ra thành 500 (SePay sẽ hiểu nhầm lỗi hạ tầng và retry
    // vô hạn, đúng điều comment ở catch bên dưới đang cố tránh) — tra lại bản
    // ghi vừa được tạo và xử lý như một lượt gửi trùng bình thường.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existingAfterRace = await prisma.paymentTransaction.findUnique({ where: { maGiaoDichNganHang: payload.referenceCode } })
      if (existingAfterRace) return { duplicate: true, transaction: existingAfterRace }
    }
    throw err
  }

  if (trangThaiDoiSoat !== "KHOP" || !matchedOrderId) {
    return { duplicate: false, transaction }
  }

  try {
    const systemStaffId = await getSystemStaffId()
    await ordersService.completeOrderViaPayment(matchedOrderId, systemStaffId)
    return { duplicate: false, transaction }
  } catch (err) {
    // Race hiếm gặp: đơn hàng đã đổi trạng thái ở nơi khác giữa lúc đối soát
    // và lúc hoàn thành (VD nhân viên vừa hủy đơn). Hạ cấp bản ghi để nhân
    // viên xử lý tay, không để lỗi nghiệp vụ này làm webhook trả lỗi HTTP
    // (tránh bên thứ 3 hiểu nhầm là lỗi hạ tầng và retry vô hạn).
    const downgraded = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { trangThaiDoiSoat: "KHONG_KHOP" },
    })
    return { duplicate: false, transaction: downgraded, note: err instanceof Error ? err.message : String(err) }
  }
}

export async function listUnmatched(params: { page: number; pageSize: number }) {
  const { page, pageSize } = params
  const where: Prisma.PaymentTransactionWhereInput = { trangThaiDoiSoat: { not: "KHOP" } }

  const [items, total] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where,
      include: { order: { select: { id: true, ma: true, tongCong: true, khachHang: { select: { hoTen: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.paymentTransaction.count({ where }),
  ])

  return { items, total, page, pageSize }
}
