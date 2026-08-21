import type { Prisma, PaymentReconciliationStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { badRequest } from "../errors/HttpError.js"
import { PAYMENT_SYSTEM_STAFF_EMAIL } from "../lib/paymentConfig.js"
import * as ordersService from "./orders.service.js"

// Mã đơn hàng dạng HDH-{năm}-{5 số} — dùng để trích mã đơn từ nội dung
// chuyển khoản khi đối soát (SRS FR-PAY.3).
const ORDER_CODE_PATTERN = /HDH-\d{4}-\d{5}/

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

  const orderCodeMatch = payload.content.match(ORDER_CODE_PATTERN)
  const order = orderCodeMatch ? await prisma.order.findUnique({ where: { ma: orderCodeMatch[0] } }) : null
  const orderIsPending =
    !!order && (order.trangThai === "MOI" || order.trangThai === "DANG_XU_LY") && order.phuongThucThanhToan === "QR_CODE"

  let trangThaiDoiSoat: PaymentReconciliationStatus
  let matchedOrderId: string | null = null

  if (!order || !orderIsPending) {
    trangThaiDoiSoat = "KHONG_KHOP"
  } else if (order.tongCong !== payload.transferAmount) {
    trangThaiDoiSoat = "SAI_SO_TIEN"
    matchedOrderId = order.id
  } else {
    trangThaiDoiSoat = "KHOP"
    matchedOrderId = order.id
  }

  // Lưu vết mọi giao dịch nhận qua webhook, kể cả không đối soát được (FR-PAY.8).
  const transaction = await prisma.paymentTransaction.create({
    data: {
      maGiaoDichNganHang: payload.referenceCode,
      orderId: matchedOrderId,
      soTienNhan: payload.transferAmount,
      noiDungChuyenKhoan: payload.content,
      trangThaiDoiSoat,
      rawPayload: payload as unknown as Prisma.InputJsonValue,
    },
  })

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
