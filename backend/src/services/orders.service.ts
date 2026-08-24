import type { DonViVanChuyen, IncomeExpenseCategory, Order, OrderItem, OrderStatus, PaymentMethod, PhuongThucNhanHang, Prisma, SalesChannel } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { canTransition, formatOrderCode } from "../lib/orderCode.js"
import { formatInvoiceCode } from "../lib/invoiceCode.js"
import { applyInventoryTransaction } from "./inventory.service.js"
import { badRequest, notFound } from "../errors/HttpError.js"
import { buildVietQrPayload } from "../lib/vietqr.js"
import { vietQrConfig, isVietQrConfigured } from "../lib/paymentConfig.js"

export const orderInclude = {
  khachHang: { select: { id: true, hoTen: true, sdt: true, email: true } },
  nhanVien: { select: { id: true, hoTen: true } },
  items: { include: { product: { select: { id: true, sku: true, ten: true, loaiSanPham: true } } } },
} satisfies Prisma.OrderInclude

export async function list(params: {
  q?: string
  trangThai?: OrderStatus
  khachHangId?: string
  nhanVienId?: string
  phuongThucThanhToan?: PaymentMethod
  daThanhToan?: boolean
  phuongThucNhanHang?: PhuongThucNhanHang
  /** true = chỉ lấy đơn Ship đã có mã vận đơn; false = đơn Ship còn thiếu mã vận đơn (cần theo dõi). */
  coMaVanDon?: boolean
  tuNgay?: Date
  denNgay?: Date
  sortBy?: "createdAt" | "tongCong"
  sortOrder?: "asc" | "desc"
  page: number
  pageSize: number
}) {
  const {
    q, trangThai, khachHangId, nhanVienId, phuongThucThanhToan, daThanhToan, phuongThucNhanHang, coMaVanDon,
    tuNgay, denNgay, sortBy = "createdAt", sortOrder = "desc", page, pageSize,
  } = params

  const where: Prisma.OrderWhereInput = {
    ...(trangThai ? { trangThai } : {}),
    ...(khachHangId ? { khachHangId } : {}),
    ...(nhanVienId ? { nhanVienId } : {}),
    ...(phuongThucThanhToan ? { phuongThucThanhToan } : {}),
    ...(daThanhToan !== undefined ? { daThanhToan } : {}),
    ...(phuongThucNhanHang ? { phuongThucNhanHang } : {}),
    ...(coMaVanDon !== undefined
      ? { phuongThucNhanHang: "SHIP", maVanDon: coMaVanDon ? { not: null } : null }
      : {}),
    ...(tuNgay || denNgay
      ? { createdAt: { ...(tuNgay ? { gte: tuNgay } : {}), ...(denNgay ? { lte: denNgay } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { ma: { contains: q, mode: "insensitive" } },
            { khachHang: { hoTen: { contains: q, mode: "insensitive" } } },
            { khachHang: { sdt: { contains: q } } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      // orders.items là quan hệ 1-nhiều — mặc định Prisma tách thành 1 round-trip
      // riêng để lấy items sau khi lấy orders. relationLoadStrategy:"join" gộp
      // lại thành 1 câu SQL JOIN duy nhất, quan trọng khi DB ở xa (Neon) và mỗi
      // round-trip tốn ~150-300ms.
      relationLoadStrategy: "join",
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ])

  return { items, total, page, pageSize }
}

/**
 * Xếp hạng khách hàng theo tổng giá trị đơn Hoàn thành — tận dụng liên kết
 * Order.khachHangId có sẵn (không cần bảng thống kê riêng). Chỉ tính đơn
 * Hoàn thành vì đó là doanh thu thật đã ghi nhận (khớp với accounting.service.ts).
 */
export async function getTopCustomers(limit: number) {
  const grouped = await prisma.order.groupBy({
    by: ["khachHangId"],
    where: { trangThai: "HOAN_THANH" },
    _sum: { tongCong: true },
    _count: { id: true },
    orderBy: { _sum: { tongCong: "desc" } },
    take: limit,
  })

  const customers = await prisma.customer.findMany({
    where: { id: { in: grouped.map((g) => g.khachHangId) } },
    select: { id: true, hoTen: true, sdt: true },
  })
  const byId = new Map(customers.map((c) => [c.id, c]))

  return grouped
    .filter((g) => byId.has(g.khachHangId))
    .map((g) => ({
      khachHang: byId.get(g.khachHangId)!,
      tongChiTieu: g._sum.tongCong ?? 0,
      soDonHoanThanh: g._count.id,
    }))
}

export async function get(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude, relationLoadStrategy: "join" })
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  return order
}

/**
 * Chỉ Admin được gọi (route-level requireRole). Chỉ xóa được đơn CHƯA có
 * Hóa đơn (nghĩa là chưa từng Hoàn thành — Hoàn thành luôn sinh Invoice, xem
 * applyOrderCompletion) — tránh xóa mất số liệu đã tính vào doanh thu/kế
 * toán. Cũng chặn nếu có PaymentTransaction hoặc Preorder tham chiếu tới đơn
 * này (ràng buộc khóa ngoại sẽ chặn ở DB nếu không kiểm tra trước, nhưng
 * kiểm tra ở đây để trả thông báo tiếng Việt rõ nghĩa).
 */
export async function remove(id: string) {
  const [order, invoice, paymentCount, preorderCount] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    prisma.invoice.findUnique({ where: { orderId: id } }),
    prisma.paymentTransaction.count({ where: { orderId: id } }),
    prisma.preorder.count({ where: { orderId: id } }),
  ])
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  if (invoice) throw badRequest("Đơn hàng đã có hóa đơn (đã từng Hoàn thành) — không thể xóa, số liệu này đã tính vào doanh thu/kế toán.")
  if (paymentCount > 0) throw badRequest("Đơn hàng có giao dịch thanh toán QR liên quan — không thể xóa.")
  if (preorderCount > 0) throw badRequest("Đơn hàng này được tạo từ một đơn đặt trước — không thể xóa để giữ lịch sử liên kết.")

  await prisma.$transaction(async (tx) => {
    // Đơn MOI/DANG_XU_LY vẫn đang "giữ" tồn kho (trừ ngay từ lúc tạo, xem
    // create()) — xóa thẳng đơn mà không hoàn tồn kho sẽ làm mất hàng oan.
    // Đơn DA_HUY thì tồn kho đã được hoàn lại từ lúc hủy rồi (updateStatus),
    // hoàn lại lần nữa ở đây sẽ bị cộng khống.
    if (order.trangThai === "MOI" || order.trangThai === "DANG_XU_LY") {
      for (const item of order.items) {
        await applyInventoryTransaction(tx, {
          productId: item.productId,
          loai: "TRA_HANG",
          soLuongThayDoi: item.soLuong,
          nguoiThucHienId: order.nhanVienId,
          thamChieu: order.ma,
          ghiChu: "Hoàn tồn kho do xóa đơn hàng",
        })
      }
    }

    // OrderItem có onDelete: Cascade trong schema — tự động xóa theo đơn hàng.
    await tx.order.delete({ where: { id } })
  })
}

interface OrderItemInput {
  productId: string
  soLuong: number
  giaOverride?: number
  giamGia: number
}

/**
 * Ràng buộc phương thức nhận hàng: chọn Ship thì PHẢI có đơn vị vận chuyển;
 * chọn Khách tới lấy thì bỏ qua/xóa đơn vị vận chuyển (tránh dữ liệu vô lý
 * kiểu "khách tới lấy nhưng ship qua SPX"). Dùng chung cho create + updateDelivery.
 */
function resolveDelivery(phuongThucNhanHang: PhuongThucNhanHang, donViVanChuyen?: DonViVanChuyen) {
  if (phuongThucNhanHang === "SHIP") {
    if (!donViVanChuyen) throw badRequest("Vui lòng chọn đơn vị vận chuyển khi giao hàng qua Ship.")
    return { phuongThucNhanHang, donViVanChuyen }
  }
  return { phuongThucNhanHang, donViVanChuyen: null }
}

export async function create(params: {
  khachHangId: string
  nhanVienId?: string
  kenhBan: SalesChannel
  phuongThucThanhToan: PaymentMethod
  phuongThucNhanHang?: PhuongThucNhanHang
  donViVanChuyen?: DonViVanChuyen
  phiShip?: number
  tienCoc?: number
  ghiChu?: string
  items: OrderItemInput[]
  fallbackNhanVienId: string
  /** false khi được gọi từ preorders.service.ts#convertToOrder — tiền cọc đó đã được ghi Thu/Chi lúc tạo đơn đặt trước, không ghi lại lần nữa. */
  recordDepositIncome?: boolean
}) {
  const { khachHangId, nhanVienId, kenhBan, phuongThucThanhToan, ghiChu, items, fallbackNhanVienId } = params
  const tienCoc = params.tienCoc ?? 0
  const phiShip = params.phiShip ?? 0
  const recordDepositIncome = params.recordDepositIncome ?? true
  const delivery = resolveDelivery(params.phuongThucNhanHang ?? "KHACH_TOI_LAY", params.donViVanChuyen)

  if (phiShip > 0 && delivery.phuongThucNhanHang !== "SHIP") {
    throw badRequest("Chỉ đơn hàng nhận qua Ship mới có phí vận chuyển.")
  }

  const customer = await prisma.customer.findUnique({ where: { id: khachHangId } })
  if (!customer) throw badRequest("Khách hàng không tồn tại.")

  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } })
  const productMap = new Map(products.map((p) => [p.id, p]))
  if (products.length !== new Set(items.map((i) => i.productId)).size) throw badRequest("Có sản phẩm không tồn tại.")

  const lines = items.map((item) => {
    const product = productMap.get(item.productId)!
    const donGia = item.giaOverride ?? product.giaBan
    const lineTotal = item.soLuong * donGia
    // Giảm giá một dòng không được vượt quá giá trị dòng đó — nếu không,
    // thanhTien/tongCong có thể âm, một cách lách qua luồng Hoàn tiền có
    // kiểm soát để tạo "doanh thu âm" không có dấu hiệu bất thường nào.
    if (item.giamGia > lineTotal) {
      throw badRequest(`Giảm giá cho sản phẩm ${product.ten} không được vượt quá giá trị dòng hàng (${lineTotal.toLocaleString("vi-VN")} VNĐ).`)
    }
    const thanhTien = lineTotal - item.giamGia
    // Chốt giá vốn tại thời điểm bán = giá nhập + phí vận chuyển, để lợi
    // nhuận gộp tính đúng chi phí thực tế đưa hàng về (không chỉ giá nhập).
    return { ...item, donGia, giaVon: product.giaVon + product.phiVanChuyen, thanhTien }
  })

  const tamTinh = lines.reduce((sum, l) => sum + l.soLuong * l.donGia, 0)
  const giamGiaTong = lines.reduce((sum, l) => sum + l.giamGia, 0)
  const tongCong = tamTinh - giamGiaTong + phiShip

  if (tienCoc > tongCong) throw badRequest("Tiền cọc không được vượt quá tổng tiền đơn hàng.")

  // Đơn thanh toán qua QR Code được cấp một mốc hết hạn cho mã QR — hết hạn
  // không tự hủy đơn, chỉ để ẩn QR khỏi giao diện (xem getQrPaymentInfo).
  const qrExpiresAt = phuongThucThanhToan === "QR_CODE" ? new Date(Date.now() + vietQrConfig.ttlMinutes * 60_000) : null

  const nguoiThucHienId = nhanVienId ?? fallbackNhanVienId

  return prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        ma: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        khachHangId,
        nhanVienId: nguoiThucHienId,
        kenhBan,
        phuongThucThanhToan,
        phuongThucNhanHang: delivery.phuongThucNhanHang,
        donViVanChuyen: delivery.donViVanChuyen,
        phiShip,
        tienCoc,
        ghiChu,
        tamTinh,
        giamGia: giamGiaTong,
        tongCong,
        qrExpiresAt,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            soLuong: l.soLuong,
            donGia: l.donGia,
            giaVon: l.giaVon,
            giamGia: l.giamGia,
            thanhTien: l.thanhTien,
          })),
        },
      },
    })

    const ma = formatOrderCode(created.soThuTu, created.createdAt)

    // Trừ tồn kho NGAY khi tạo đơn (giữ hàng cho đơn này) — không đợi tới lúc
    // Hoàn thành, để tránh nhận nhiều đơn cộng lại vượt quá tồn kho thực tế
    // (ví dụ 10 đơn x 1 cái trong khi chỉ còn 5, mà đơn nào cũng "chưa xong"
    // nên tồn kho hiển thị vẫn là 5). Hủy đơn (DA_HUY) mới hoàn lại, xem
    // updateStatus. Gộp số lượng theo productId trước khi trừ để đúng nếu
    // đơn có nhiều dòng cùng một sản phẩm.
    const qtyByProduct = new Map<string, number>()
    for (const l of lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.soLuong)
    for (const [productId, soLuong] of qtyByProduct) {
      await applyInventoryTransaction(tx, {
        productId,
        loai: "XUAT",
        soLuongThayDoi: -soLuong,
        nguoiThucHienId,
        thamChieu: ma,
        ghiChu: "Trừ tồn kho khi tạo đơn hàng",
      })
    }

    // Tiền cọc là tiền thật đã thu ngay lúc tạo đơn — ghi nhận vào sổ Thu/Chi
    // để phản ánh đúng dòng tiền (giống cách Preorder ghi cọc — xem
    // preorders.service.ts#create). Bỏ qua nếu đơn này vừa được tạo ra từ
    // convertToOrder (tiền đó đã lên sổ Thu/Chi từ lúc tạo đơn đặt trước rồi).
    if (tienCoc > 0 && recordDepositIncome) {
      const receipt = await tx.incomeExpense.create({
        data: {
          maPhieu: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          loai: "THU",
          danhMuc: "BAN_HANG",
          noiDung: `Đặt cọc đơn hàng ${ma}`,
          soTien: tienCoc,
          nguoiTaoId: nguoiThucHienId,
        },
      })
      await tx.incomeExpense.update({
        where: { id: receipt.id },
        data: { maPhieu: `PT-${String(receipt.soThuTu).padStart(5, "0")}` },
      })
    }

    return tx.order.update({
      where: { id: created.id },
      data: { ma },
      include: orderInclude,
    })
  })
}

/**
 * Side-effect chung khi một đơn hàng được hoàn thành: tăng số đã bán rồi sinh
 * hóa đơn. Dùng chung bởi cả luồng nhân viên chuyển trạng thái thủ công
 * (updateStatus) và luồng hệ thống tự hoàn thành khi đối soát thanh toán QR
 * khớp (completeOrderViaPayment) — đảm bảo hai luồng không bao giờ lệch hành
 * vi (SDS mục 5.8). KHÔNG trừ tồn kho ở đây nữa — tồn kho đã bị trừ ngay từ
 * lúc tạo đơn (xem create()), tránh trừ hai lần.
 */
async function applyOrderCompletion(
  tx: Prisma.TransactionClient,
  order: Pick<Order, "id" | "ma" | "tongCong" | "tienCoc"> & { items: Pick<OrderItem, "productId" | "soLuong" | "giaVon">[] },
  nguoiThucHienId: string,
) {
  for (const item of order.items) {
    await tx.product.update({ where: { id: item.productId }, data: { daBan: { increment: item.soLuong } } })
  }

  const createdInvoice = await tx.invoice.create({
    data: {
      soHoaDon: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId: order.id,
      nguoiTaoId: nguoiThucHienId,
    },
  })
  await tx.invoice.update({
    where: { id: createdInvoice.id },
    data: { soHoaDon: formatInvoiceCode(createdInvoice.soThuTu, createdInvoice.createdAt) },
  })

  // Ghi nhận dòng tiền thật vào sổ Thu/Chi khi đơn hoàn thành — trước đây sổ
  // quỹ chỉ có tiền cọc (nếu có), không có doanh thu/giá vốn thật của đơn,
  // khiến "Lợi nhuận" tính từ sổ quỹ (accounting.service.ts) và "Lợi nhuận
  // gộp" tính từ đơn hàng (revenue.service.ts) ra 2 số khác nhau (BUG-017).
  // Không ghi lại phần tiền cọc — đã lên sổ Thu từ lúc tạo đơn/đặt trước rồi.
  const giaVonDon = order.items.reduce((sum, i) => sum + i.soLuong * i.giaVon, 0)
  const doanhThuConLai = order.tongCong - order.tienCoc
  if (doanhThuConLai > 0) {
    await createLedgerEntry(tx, {
      loai: "THU",
      danhMuc: "BAN_HANG",
      noiDung: `Doanh thu bán hàng đơn ${order.ma}`,
      soTien: doanhThuConLai,
      nguoiTaoId: nguoiThucHienId,
    })
  }
  if (giaVonDon > 0) {
    await createLedgerEntry(tx, {
      loai: "CHI",
      danhMuc: "NHAP_HANG",
      noiDung: `Giá vốn hàng bán đơn ${order.ma}`,
      soTien: giaVonDon,
      nguoiTaoId: nguoiThucHienId,
    })
  }
}

async function createLedgerEntry(
  tx: Prisma.TransactionClient,
  params: { loai: "THU" | "CHI"; danhMuc: IncomeExpenseCategory; noiDung: string; soTien: number; nguoiTaoId: string },
) {
  const created = await tx.incomeExpense.create({
    data: {
      maPhieu: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      loai: params.loai,
      danhMuc: params.danhMuc,
      noiDung: params.noiDung,
      soTien: params.soTien,
      nguoiTaoId: params.nguoiTaoId,
    },
  })
  await tx.incomeExpense.update({
    where: { id: created.id },
    data: { maPhieu: `${params.loai === "THU" ? "PT" : "PC"}-${String(created.soThuTu).padStart(5, "0")}` },
  })
}

export async function updateStatus(params: { orderId: string; trangThai: OrderStatus; nguoiThucHienId: string }) {
  const { orderId, trangThai, nguoiThucHienId } = params

  const current = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!current) throw notFound("Không tìm thấy đơn hàng.")

  if (!canTransition(current.trangThai, trangThai)) {
    throw badRequest(`Không thể chuyển trạng thái từ ${current.trangThai} sang ${trangThai}.`)
  }

  return prisma.$transaction(async (tx) => {
    if (trangThai === "HOAN_THANH") {
      await applyOrderCompletion(tx, current, nguoiThucHienId)
    }

    // Hủy đơn (chỉ xảy ra từ Mới/Đang xử lý, theo canTransition) — tồn kho đã
    // bị trừ ngay lúc tạo đơn nên phải hoàn lại, không thì kho sẽ "mất" hàng
    // của những đơn bị hủy.
    if (trangThai === "DA_HUY") {
      for (const item of current.items) {
        await applyInventoryTransaction(tx, {
          productId: item.productId,
          loai: "TRA_HANG",
          soLuongThayDoi: item.soLuong,
          nguoiThucHienId,
          thamChieu: current.ma,
          ghiChu: "Hoàn tồn kho do hủy đơn hàng",
        })
      }
    }

    if (trangThai === "HOAN_TIEN" && current.trangThai === "HOAN_THANH") {
      for (const item of current.items) {
        await tx.product.update({ where: { id: item.productId }, data: { daBan: { decrement: item.soLuong } } })
        await applyInventoryTransaction(tx, {
          productId: item.productId,
          loai: "TRA_HANG",
          soLuongThayDoi: item.soLuong,
          nguoiThucHienId,
          thamChieu: current.ma,
          ghiChu: "Hoàn kho do hoàn tiền đơn hàng",
        })
      }

      // Đảo ngược đúng 2 bút toán đã ghi lúc Hoàn thành (applyOrderCompletion)
      // — nếu không, doanh thu/giá vốn của đơn đã hoàn tiền vẫn còn nằm trong
      // sổ Thu/Chi dù đơn không còn tính vào doanh thu/lợi nhuận nữa (BUG-017).
      const giaVonDon = current.items.reduce((sum, i) => sum + i.soLuong * i.giaVon, 0)
      const doanhThuDaGhi = current.tongCong - current.tienCoc
      if (doanhThuDaGhi > 0) {
        await createLedgerEntry(tx, {
          loai: "CHI",
          danhMuc: "BAN_HANG",
          noiDung: `Hoàn tiền đơn hàng ${current.ma}`,
          soTien: doanhThuDaGhi,
          nguoiTaoId: nguoiThucHienId,
        })
      }
      if (giaVonDon > 0) {
        await createLedgerEntry(tx, {
          loai: "THU",
          danhMuc: "NHAP_HANG",
          noiDung: `Hoàn giá vốn do hoàn tiền đơn hàng ${current.ma}`,
          soTien: giaVonDon,
          nguoiTaoId: nguoiThucHienId,
        })
      }
    }

    return tx.order.update({ where: { id: orderId }, data: { trangThai }, include: orderInclude })
  })
}

/**
 * Đánh dấu đơn hàng đã/chưa thanh toán — hoàn toàn độc lập với trangThai xử
 * lý đơn (Mới/Đang xử lý/Hoàn thành...); nhân viên tự bấm theo thực tế đã
 * thu tiền hay chưa, không có ràng buộc/gating gì với các trạng thái khác.
 */
export async function updatePaymentStatus(orderId: string, daThanhToan: boolean) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  return prisma.order.update({ where: { id: orderId }, data: { daThanhToan }, include: orderInclude })
}

/** Đổi phương thức nhận hàng (Khách tới lấy/Ship) và đơn vị vận chuyển — độc lập với trangThai xử lý đơn, sửa được bất kỳ lúc nào. */
export async function updateDelivery(orderId: string, phuongThucNhanHang: PhuongThucNhanHang, donViVanChuyen?: DonViVanChuyen) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  const delivery = resolveDelivery(phuongThucNhanHang, donViVanChuyen)
  return prisma.order.update({ where: { id: orderId }, data: delivery, include: orderInclude })
}

/**
 * Ghi mã vận đơn (chỉ áp dụng cho đơn Ship, thường điền sau khi đã gửi hàng
 * và/hoặc khách đã chuyển khoản xong) — dùng để tra cứu/gửi lại cho khách.
 * Cho phép xóa (truyền chuỗi rỗng/undefined) để sửa lại nếu nhập nhầm.
 */
export async function updateTrackingCode(orderId: string, maVanDon?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  const trimmed = maVanDon?.trim()
  if (trimmed && order.phuongThucNhanHang !== "SHIP") {
    throw badRequest("Chỉ đơn hàng nhận qua Ship mới cần mã vận đơn.")
  }
  return prisma.order.update({ where: { id: orderId }, data: { maVanDon: trimmed || null }, include: orderInclude })
}

/**
 * Sửa phí vận chuyển tính cho khách (chỉ đơn Ship) — thường điền/sửa sau khi
 * biết chính xác phí ship thật (lúc tạo đơn có thể chưa rõ). Chỉ cho sửa khi
 * đơn CHƯA Hoàn thành: một khi Hoàn thành, tongCong đã được "chốt" vào Hóa
 * đơn và sổ Thu/Chi (applyOrderCompletion) — sửa sau đó sẽ làm 2 nơi đó lệch
 * khỏi Order, đúng lỗi vừa sửa ở BUG-017.
 */
export async function updateShippingFee(orderId: string, phiShip: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  if (order.phuongThucNhanHang !== "SHIP") {
    throw badRequest("Chỉ đơn hàng nhận qua Ship mới có phí vận chuyển.")
  }
  if (order.trangThai !== "MOI" && order.trangThai !== "DANG_XU_LY") {
    throw badRequest("Đơn hàng đã Hoàn thành/Hủy/Hoàn tiền — không thể sửa phí vận chuyển.")
  }

  const tongCongMoi = order.tongCong - order.phiShip + phiShip
  if (order.tienCoc > tongCongMoi) throw badRequest("Phí vận chuyển làm tổng tiền đơn nhỏ hơn tiền cọc đã nhận — vui lòng kiểm tra lại.")

  return prisma.order.update({ where: { id: orderId }, data: { phiShip, tongCong: tongCongMoi }, include: orderInclude })
}

/**
 * Kích hoạt bởi payments.service khi đối soát thanh toán QR khớp (webhook
 * ngân hàng). Cho phép nhảy thẳng MOI/DANG_XU_LY -> HOAN_THANH — một ngoại
 * lệ có chủ đích của máy trạng thái ở canTransition (SRS FR-ORD.4, FR-PAY.4).
 */
export async function completeOrderViaPayment(orderId: string, systemStaffId: string) {
  const current = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!current) throw notFound("Không tìm thấy đơn hàng.")

  if (current.trangThai !== "MOI" && current.trangThai !== "DANG_XU_LY") {
    throw badRequest(`Đơn hàng đang ở trạng thái ${current.trangThai}, không thể tự hoàn thành qua thanh toán QR.`)
  }
  if (current.phuongThucThanhToan !== "QR_CODE") {
    throw badRequest("Đơn hàng không sử dụng phương thức thanh toán QR Code.")
  }

  return prisma.$transaction(async (tx) => {
    await applyOrderCompletion(tx, current, systemStaffId)
    // Tiền thật đã được ngân hàng xác nhận qua đối soát — đánh dấu luôn đã
    // thanh toán, khác với luồng nhân viên tự hoàn thành đơn tay (không tự
    // đổi trạng thái thanh toán, xem updatePaymentStatus).
    return tx.order.update({ where: { id: orderId }, data: { trangThai: "HOAN_THANH", daThanhToan: true }, include: orderInclude })
  })
}

export interface QrPaymentInfo {
  configured: boolean
  payload: string | null
  expiresAt: Date | null
  expired: boolean
}

/**
 * Tính (không truy vấn DB) thông tin QR thanh toán hiển thị cho một đơn hàng,
 * nếu còn áp dụng được (phương thức QR Code, đơn chưa hoàn thành/hủy).
 */
export function getQrPaymentInfo(order: Pick<Order, "ma" | "tongCong" | "phuongThucThanhToan" | "trangThai" | "qrExpiresAt">): QrPaymentInfo | null {
  if (order.phuongThucThanhToan !== "QR_CODE") return null
  if (order.trangThai !== "MOI" && order.trangThai !== "DANG_XU_LY") return null

  const expired = order.qrExpiresAt ? order.qrExpiresAt.getTime() < Date.now() : false

  if (!isVietQrConfigured()) {
    return { configured: false, payload: null, expiresAt: order.qrExpiresAt, expired }
  }

  const payload = buildVietQrPayload({
    bankBin: vietQrConfig.bankBin,
    accountNo: vietQrConfig.accountNo,
    accountName: vietQrConfig.accountName,
    amount: order.tongCong,
    addInfo: order.ma,
  })

  return { configured: true, payload, expiresAt: order.qrExpiresAt, expired }
}
