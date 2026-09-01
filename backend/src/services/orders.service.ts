import type { DonViVanChuyen, IncomeExpenseCategory, Order, OrderItem, OrderStatus, PaymentMethod, PhuongThucNhanHang, Prisma, SalesChannel } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { canTransition, formatOrderCode } from "../lib/orderCode.js"
import { formatInvoiceCode } from "../lib/invoiceCode.js"
import { applyInventoryTransaction } from "./inventory.service.js"
import { badRequest, conflict, notFound } from "../errors/HttpError.js"
import { buildVietQrPayload } from "../lib/vietqr.js"
import { vietQrConfig, isVietQrConfigured } from "../lib/paymentConfig.js"

export const orderInclude = {
  khachHang: { select: { id: true, hoTen: true, sdt: true, email: true } },
  nhanVien: { select: { id: true, hoTen: true } },
  items: { include: { product: { select: { id: true, sku: true, ten: true, loaiSanPham: true } } } },
  invoice: { select: { id: true, soHoaDon: true } },
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
 * Dữ liệu cho phiếu tạm tính (xem invoicePdf.ts#renderInvoicePdf provisional) —
 * in trước khi đơn Hoàn thành, không phải Hóa đơn chính thức nên không dùng
 * orderInclude (thiếu diaChi/paymentTransactions mà mẫu PDF cần).
 */
export async function getForPreviewPdf(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      khachHang: { select: { hoTen: true, sdt: true, email: true, diaChi: true } },
      nhanVien: { select: { hoTen: true } },
      items: { include: { product: { select: { sku: true, ten: true, loaiSanPham: true } } } },
      paymentTransactions: { select: { maGiaoDichNganHang: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    relationLoadStrategy: "join",
  })
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  return order
}

/**
 * Chỉ Admin được gọi (route-level requireRole). Chỉ xóa được đơn CHƯA có
 * Hóa đơn (nghĩa là chưa từng Hoàn thành — Hoàn thành luôn sinh Invoice, xem
 * applyOrderCompletion) — tránh xóa mất số liệu đã tính vào doanh thu/kế
 * toán. Cũng chặn nếu có PaymentTransaction tham chiếu tới đơn này (ràng
 * buộc khóa ngoại sẽ chặn ở DB nếu không kiểm tra trước, nhưng kiểm tra ở
 * đây để trả thông báo tiếng Việt rõ nghĩa).
 */
export async function remove(id: string) {
  const [order, invoice, paymentCount] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    prisma.invoice.findUnique({ where: { orderId: id } }),
    prisma.paymentTransaction.count({ where: { orderId: id } }),
  ])
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  if (invoice) throw badRequest("Đơn hàng đã có hóa đơn (đã từng Hoàn thành) — không thể xóa, số liệu này đã tính vào doanh thu/kế toán.")
  if (paymentCount > 0) throw badRequest("Đơn hàng có giao dịch thanh toán QR liên quan — không thể xóa.")

  await prisma.$transaction(async (tx) => {
    // Đơn MOI/DANG_XU_LY vẫn đang "giữ" tồn kho + "đã bán" (trừ kho và cộng
    // đã bán ngay từ lúc tạo, xem create()) — xóa thẳng đơn mà không hoàn lại
    // cả hai sẽ làm mất hàng oan / sản phẩm hiện "đã bán" cho một đơn không
    // còn tồn tại. Đơn DA_HUY thì cả hai đã được hoàn lại từ lúc hủy rồi
    // (updateStatus), hoàn lại lần nữa ở đây sẽ bị cộng khống.
    if (order.trangThai === "MOI" || order.trangThai === "DANG_XU_LY") {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { daBan: { decrement: item.soLuong } } })
        await applyInventoryTransaction(tx, {
          productId: item.productId,
          loai: "TRA_HANG",
          soLuongThayDoi: item.soLuong,
          nguoiThucHienId: order.nhanVienId,
          thamChieu: order.ma,
          ghiChu: "Hoàn tồn kho do xóa đơn hàng",
        })
      }

      // Khác với hủy đơn (DA_HUY — shop giữ cọc làm phí hủy, xem updateStatus)
      // — đây là ADMIN XÓA HẲN bản ghi đơn hàng (thường do nhập nhầm), không
      // phải khách chủ động hủy, nên vẫn hoàn cọc như một giao dịch chưa từng
      // xảy ra: nếu có cọc thì đó là tiền THU đã ghi sổ lúc tạo đơn, xóa đơn
      // mà không hoàn lại sẽ khiến khoản cọc đó mãi mãi nằm trong sổ quỹ dù
      // đơn không còn tồn tại.
      if (order.tienCoc > 0) {
        await createLedgerEntry(tx, {
          loai: "CHI",
          danhMuc: "BAN_HANG",
          noiDung: `Hoàn cọc do xóa đơn hàng ${order.ma}`,
          soTien: order.tienCoc,
          nguoiTaoId: order.nhanVienId,
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
}) {
  const { khachHangId, nhanVienId, kenhBan, phuongThucThanhToan, ghiChu, items, fallbackNhanVienId } = params
  const tienCoc = params.tienCoc ?? 0
  const phiShip = params.phiShip ?? 0
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

    // Tính "đã bán" ngay khi tạo đơn (không đợi Hoàn thành) — đơn hàng coi
    // như đã bán ngay từ lúc lên đơn. Nếu sau đó đơn bị Hủy thì trừ lại (xem
    // nhánh DA_HUY của updateStatus) — applyOrderCompletion không cộng lại
    // daBan nữa (tránh cộng 2 lần), chỉ còn lo hóa đơn + sổ Thu/Chi.
    for (const [productId, soLuong] of qtyByProduct) {
      await tx.product.update({ where: { id: productId }, data: { daBan: { increment: soLuong } } })
    }

    // Tiền cọc là tiền thật đã thu ngay lúc tạo đơn — ghi nhận vào sổ Thu/Chi
    // để phản ánh đúng dòng tiền.
    if (tienCoc > 0) {
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
 * Side-effect chung khi một đơn hàng được hoàn thành: sinh hóa đơn chính
 * thức + ghi doanh thu/giá vốn vào sổ Thu-Chi. Dùng chung bởi cả luồng nhân
 * viên chuyển trạng thái thủ công (updateStatus) và luồng hệ thống tự hoàn
 * thành khi đối soát thanh toán QR khớp (completeOrderViaPayment) — đảm bảo
 * hai luồng không bao giờ lệch hành vi (SDS mục 5.8). KHÔNG trừ tồn kho hay
 * cộng "đã bán" ở đây nữa — cả hai đã được xử lý ngay từ lúc tạo đơn (xem
 * create()), tránh trừ/cộng hai lần.
 */
async function applyOrderCompletion(
  tx: Prisma.TransactionClient,
  order: Pick<Order, "id" | "ma" | "tongCong" | "tienCoc"> & { items: Pick<OrderItem, "productId" | "soLuong" | "giaVon">[] },
  nguoiThucHienId: string,
) {
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

export async function createLedgerEntry(
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
    // So-sánh-rồi-ghi (cùng kiểu compare-and-swap của applyInventoryTransaction)
    // — chặn 2 yêu cầu đổi trạng thái cùng lúc cho cùng 1 đơn (VD nhân viên
    // bấm "Hoàn thành" tay đúng lúc webhook thanh toán QR cũng đang tự hoàn
    // thành đơn đó) áp dụng side-effect (hóa đơn, sổ Thu/Chi, trừ/hoàn kho)
    // hai lần. Chỉ request nào khớp đúng trạng thái vừa đọc mới được ghi.
    const claim = await tx.order.updateMany({
      where: { id: orderId, trangThai: current.trangThai },
      data: { trangThai, ...(trangThai === "HOAN_TIEN" ? { hoanTienAt: new Date() } : {}) },
    })
    if (claim.count === 0) {
      throw conflict("Đơn hàng vừa được thay đổi trạng thái ở nơi khác, vui lòng tải lại trang.")
    }

    if (trangThai === "HOAN_THANH") {
      await applyOrderCompletion(tx, current, nguoiThucHienId)
    }

    // Hủy đơn (chỉ xảy ra từ Mới/Đang xử lý, theo canTransition) — tồn kho đã
    // bị trừ ngay lúc tạo đơn nên phải hoàn lại, không thì kho sẽ "mất" hàng
    // của những đơn bị hủy. "Đã bán" cũng đã cộng ngay lúc tạo đơn (xem
    // create()) nên phải trừ lại tương ứng — nếu không, sản phẩm vẫn hiện
    // "đã bán" cho một đơn thực ra đã hủy.
    if (trangThai === "DA_HUY") {
      for (const item of current.items) {
        await tx.product.update({ where: { id: item.productId }, data: { daBan: { decrement: item.soLuong } } })
        await applyInventoryTransaction(tx, {
          productId: item.productId,
          loai: "TRA_HANG",
          soLuongThayDoi: item.soLuong,
          nguoiThucHienId,
          thamChieu: current.ma,
          ghiChu: "Hoàn tồn kho do hủy đơn hàng",
        })
      }

      // Khác với hoàn tiền (nhánh HOAN_TIEN bên dưới) — khách TỰ hủy đơn thì
      // shop giữ lại tiền cọc đã thu (không hoàn), coi như phí hủy đơn. Tiền
      // cọc vẫn nằm nguyên trong sổ Thu/Chi từ lúc tạo đơn, không tạo bút
      // toán hoàn lại ở đây nữa.
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
      // Hoàn cọc luôn cho khách khi đơn bị Hoàn tiền — tiền cọc là một phần
      // của cùng giao dịch đã bị hủy, không tách riêng khỏi 2 bút toán trên.
      if (current.tienCoc > 0) {
        await createLedgerEntry(tx, {
          loai: "CHI",
          danhMuc: "BAN_HANG",
          noiDung: `Hoàn cọc đơn hàng ${current.ma}`,
          soTien: current.tienCoc,
          nguoiTaoId: nguoiThucHienId,
        })
      }
    }

    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude, relationLoadStrategy: "join" })
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
 * Sửa tiền cọc sau khi tạo đơn — khách có thể đặt cọc muộn hơn lúc tạo đơn
 * (hoặc staff nhập nhầm số cọc ban đầu). Chỉ cho sửa khi đơn CHƯA Hoàn thành,
 * cùng lý do với updateShippingFee: applyOrderCompletion đã dùng tienCoc để
 * chốt doanh thu còn lại vào Hóa đơn + sổ Thu/Chi, sửa sau đó sẽ làm 2 nơi lệch
 * nhau (BUG-017). Phần chênh lệch (tăng/giảm) được ghi luôn vào sổ Thu/Chi,
 * giống cách tiền cọc lúc tạo đơn được ghi nhận (xem create()).
 */
export async function updateDeposit(orderId: string, tienCoc: number, nguoiThucHienId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  if (order.trangThai !== "MOI" && order.trangThai !== "DANG_XU_LY") {
    throw badRequest("Đơn hàng đã Hoàn thành/Hủy/Hoàn tiền — không thể sửa tiền cọc.")
  }
  if (tienCoc > order.tongCong) throw badRequest("Tiền cọc không được vượt quá tổng tiền đơn hàng.")

  const delta = tienCoc - order.tienCoc
  return prisma.$transaction(async (tx) => {
    if (delta > 0) {
      await createLedgerEntry(tx, { loai: "THU", danhMuc: "BAN_HANG", noiDung: `Đặt cọc thêm đơn hàng ${order.ma}`, soTien: delta, nguoiTaoId: nguoiThucHienId })
    } else if (delta < 0) {
      await createLedgerEntry(tx, { loai: "CHI", danhMuc: "BAN_HANG", noiDung: `Hoàn một phần tiền cọc đơn hàng ${order.ma}`, soTien: -delta, nguoiTaoId: nguoiThucHienId })
    }
    return tx.order.update({ where: { id: orderId }, data: { tienCoc }, include: orderInclude })
  })
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
    // So-sánh-rồi-ghi — chặn đơn này bị hoàn thành 2 lần (double invoice/sổ
    // Thu-Chi) nếu webhook đối soát chạy gần như đồng thời với một thao
    // tác khác cũng đổi trạng thái đơn này (nhân viên hoàn thành tay, hoặc
    // một lượt gọi webhook trùng thời điểm khác). Trước đây chỉ kiểm tra
    // trangThai đọc NGOÀI transaction rồi ghi thẳng theo id, không có gì chặn
    // 2 giao dịch cùng đọc "MOI" trước khi cả hai commit.
    const claim = await tx.order.updateMany({
      where: { id: orderId, trangThai: { in: ["MOI", "DANG_XU_LY"] } },
      // Tiền thật đã được ngân hàng xác nhận qua đối soát — đánh dấu luôn đã
      // thanh toán, khác với luồng nhân viên tự hoàn thành đơn tay (không tự
      // đổi trạng thái thanh toán, xem updatePaymentStatus).
      data: { trangThai: "HOAN_THANH", daThanhToan: true },
    })
    if (claim.count === 0) {
      throw conflict("Đơn hàng đã được xử lý ở nơi khác trước khi thanh toán được đối soát.")
    }
    await applyOrderCompletion(tx, current, systemStaffId)
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude, relationLoadStrategy: "join" })
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
export function getQrPaymentInfo(
  order: Pick<Order, "ma" | "tongCong" | "tienCoc" | "phuongThucThanhToan" | "trangThai" | "qrExpiresAt">,
): QrPaymentInfo | null {
  if (order.phuongThucThanhToan !== "QR_CODE") return null
  if (order.trangThai !== "MOI" && order.trangThai !== "DANG_XU_LY") return null

  // Số tiền cần thu qua QR là phần CÒN LẠI sau khi trừ cọc đã nhận — trước
  // đây luôn yêu cầu đủ tongCong kể cả khi đơn đã có cọc, khiến khách chuyển
  // đúng phần còn thiếu (hợp lý) sẽ không bao giờ khớp số tiền đối soát
  // (payments.service.ts so cùng con số này). Nếu cọc đã bằng/vượt tongCong
  // thì không còn gì để thu qua chuyển khoản nữa — không hiển thị QR.
  const soTienCanThu = order.tongCong - order.tienCoc
  if (soTienCanThu <= 0) return null

  const expired = order.qrExpiresAt ? order.qrExpiresAt.getTime() < Date.now() : false

  if (!isVietQrConfigured()) {
    return { configured: false, payload: null, expiresAt: order.qrExpiresAt, expired }
  }

  const payload = buildVietQrPayload({
    bankBin: vietQrConfig.bankBin,
    accountNo: vietQrConfig.accountNo,
    accountName: vietQrConfig.accountName,
    amount: soTienCanThu,
    addInfo: order.ma,
  })

  return { configured: true, payload, expiresAt: order.qrExpiresAt, expired }
}
