import type { PaymentMethod, PreorderStatus, Prisma, SalesChannel } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { formatPreorderCode } from "../lib/preorderCode.js"
import { badRequest, conflict, notFound } from "../errors/HttpError.js"
import * as ordersService from "./orders.service.js"

export const preorderInclude = {
  khachHang: { select: { id: true, hoTen: true, sdt: true, email: true } },
  nhanVien: { select: { id: true, hoTen: true } },
  product: { select: { id: true, sku: true, ten: true, giaBan: true, tonKho: true } },
} satisfies Prisma.PreorderInclude

export async function list(params: {
  q?: string
  trangThai?: PreorderStatus
  khachHangId?: string
  productId?: string
  page: number
  pageSize: number
}) {
  const { q, trangThai, khachHangId, productId, page, pageSize } = params

  const where: Prisma.PreorderWhereInput = {
    ...(trangThai ? { trangThai } : {}),
    ...(khachHangId ? { khachHangId } : {}),
    ...(productId ? { productId } : {}),
    ...(q
      ? {
          OR: [
            { ma: { contains: q, mode: "insensitive" } },
            { tenSanPhamMoi: { contains: q, mode: "insensitive" } },
            { khachHang: { hoTen: { contains: q, mode: "insensitive" } } },
            { khachHang: { sdt: { contains: q } } },
            { product: { ten: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.preorder.findMany({
      where,
      include: preorderInclude,
      relationLoadStrategy: "join",
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.preorder.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function getSummary() {
  const [dangChoHang, sanSangGiao, coc] = await Promise.all([
    prisma.preorder.count({ where: { trangThai: "CHO_HANG" } }),
    prisma.preorder.count({ where: { trangThai: "SAN_SANG" } }),
    prisma.preorder.aggregate({ where: { trangThai: { in: ["CHO_HANG", "SAN_SANG"] } }, _sum: { tienCoc: true } }),
  ])

  return { dangChoHang, sanSangGiao, tongTienCocDangGiu: coc._sum.tienCoc ?? 0 }
}

export async function get(id: string) {
  const preorder = await prisma.preorder.findUnique({ where: { id }, include: preorderInclude, relationLoadStrategy: "join" })
  if (!preorder) throw notFound("Không tìm thấy đơn đặt trước.")
  return preorder
}

export async function create(params: {
  khachHangId: string
  nhanVienId?: string
  productId?: string
  tenSanPhamMoi?: string
  soLuong: number
  donGiaDuKien: number
  tienCoc: number
  ngayDuKienCo?: Date
  ghiChu?: string
  fallbackNhanVienId: string
}) {
  const { productId, tenSanPhamMoi } = params
  if (!productId && !tenSanPhamMoi) throw badRequest("Cần chọn sản phẩm có sẵn hoặc nhập tên sản phẩm mới.")
  if (productId && tenSanPhamMoi) throw badRequest("Chỉ chọn một trong hai: sản phẩm có sẵn hoặc sản phẩm mới, không chọn cả hai.")
  if (params.tienCoc > params.soLuong * params.donGiaDuKien) {
    throw badRequest("Tiền cọc không được vượt quá tổng giá trị dự kiến của đơn đặt trước.")
  }

  const customer = await prisma.customer.findUnique({ where: { id: params.khachHangId } })
  if (!customer) throw badRequest("Khách hàng không tồn tại.")

  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw badRequest("Sản phẩm không tồn tại.")
  }

  const nhanVienId = params.nhanVienId ?? params.fallbackNhanVienId

  return prisma.$transaction(async (tx) => {
    const created = await tx.preorder.create({
      data: {
        ma: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        khachHangId: params.khachHangId,
        nhanVienId,
        productId: productId ?? null,
        tenSanPhamMoi: tenSanPhamMoi ?? null,
        soLuong: params.soLuong,
        donGiaDuKien: params.donGiaDuKien,
        tienCoc: params.tienCoc,
        ngayDuKienCo: params.ngayDuKienCo,
        ghiChu: params.ghiChu,
      },
    })

    const ma = formatPreorderCode(created.soThuTu, created.createdAt)

    // Tiền cọc là tiền thật đã thu — ghi nhận luôn vào sổ Thu/Chi để phản ánh
    // đúng dòng tiền, không chỉ nằm im trong bản ghi Preorder.
    if (params.tienCoc > 0) {
      const receipt = await tx.incomeExpense.create({
        data: {
          maPhieu: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          loai: "THU",
          danhMuc: "BAN_HANG",
          noiDung: `Đặt cọc đơn đặt trước ${ma}`,
          soTien: params.tienCoc,
          nguoiTaoId: nhanVienId,
        },
      })
      await tx.incomeExpense.update({
        where: { id: receipt.id },
        data: { maPhieu: `PT-${String(receipt.soThuTu).padStart(5, "0")}` },
      })
    }

    return tx.preorder.update({ where: { id: created.id }, data: { ma }, include: preorderInclude })
  })
}

export async function update(
  id: string,
  data: Partial<{ soLuong: number; donGiaDuKien: number; tienCoc: number; ngayDuKienCo: Date; ghiChu: string }>,
) {
  const current = await prisma.preorder.findUnique({ where: { id } })
  if (!current) throw notFound("Không tìm thấy đơn đặt trước.")
  if (current.trangThai === "DA_CHUYEN_DON" || current.trangThai === "DA_HUY") {
    throw badRequest("Không thể sửa đơn đặt trước đã chuyển thành đơn hàng hoặc đã hủy.")
  }

  const soLuong = data.soLuong ?? current.soLuong
  const donGiaDuKien = data.donGiaDuKien ?? current.donGiaDuKien
  const tienCoc = data.tienCoc ?? current.tienCoc
  if (tienCoc > soLuong * donGiaDuKien) throw badRequest("Tiền cọc không được vượt quá tổng giá trị dự kiến.")

  return prisma.preorder.update({ where: { id }, data, include: preorderInclude })
}

/**
 * Không có bảng nào FK tới Preorder (chỉ Preorder FK tới Product/Customer/
 * Staff/Order), nên xóa được ở MỌI trạng thái, kể cả DA_CHUYEN_DON — Order
 * được tạo ra khi chuyển đơn đã tự chứa đủ dữ liệu độc lập (items, giá,
 * ghiChu ghi rõ số tiền cọc) nên xóa bản ghi Preorder không làm mất hay ảnh
 * hưởng gì tới đơn hàng thật đó.
 */
export async function remove(id: string) {
  const current = await prisma.preorder.findUnique({ where: { id } })
  if (!current) throw notFound("Không tìm thấy đơn đặt trước.")
  await prisma.preorder.delete({ where: { id } })
}

export async function cancel(id: string, nguoiThucHienId: string) {
  const current = await prisma.preorder.findUnique({ where: { id } })
  if (!current) throw notFound("Không tìm thấy đơn đặt trước.")
  if (current.trangThai === "DA_CHUYEN_DON") throw badRequest("Đơn đặt trước đã chuyển thành đơn hàng, không thể hủy.")
  if (current.trangThai === "DA_HUY") throw badRequest("Đơn đặt trước đã hủy trước đó.")

  return prisma.$transaction(async (tx) => {
    // So-sánh-rồi-ghi — chặn 2 lượt hủy cùng lúc cho cùng 1 đơn đặt trước
    // (double-click, hoặc 2 request trùng) cùng hoàn cọc 2 lần cho một khoản
    // cọc chỉ thu Thu một lần duy nhất lúc tạo.
    const claim = await tx.preorder.updateMany({ where: { id, trangThai: current.trangThai }, data: { trangThai: "DA_HUY" } })
    if (claim.count === 0) {
      throw conflict("Đơn đặt trước vừa được xử lý ở nơi khác, vui lòng tải lại trang.")
    }

    // Hoàn cọc luôn cho khách khi hủy đặt trước — tiền cọc đã ghi Thu lúc tạo
    // đơn đặt trước (create()), nếu không đảo ngược sẽ mãi nằm trong sổ quỹ
    // dù đơn đặt trước không còn thành hiện thực nữa.
    if (current.tienCoc > 0) {
      await ordersService.createLedgerEntry(tx, {
        loai: "CHI",
        danhMuc: "BAN_HANG",
        noiDung: `Hoàn cọc đơn đặt trước ${current.ma}`,
        soTien: current.tienCoc,
        nguoiTaoId: nguoiThucHienId,
      })
    }

    return tx.preorder.findUniqueOrThrow({ where: { id }, include: preorderInclude, relationLoadStrategy: "join" })
  })
}

/**
 * Nhân viên xác nhận một đơn đặt trước đã có hàng/đã thỏa thuận xong với
 * khách -> tạo một Order thật (dùng chung orders.service.ts#create, không
 * viết lại logic) rồi đánh dấu Preorder là DA_CHUYEN_DON. Việc trừ kho/sinh
 * hóa đơn vẫn diễn ra như một đơn hàng bình thường, khi đơn đó được chuyển
 * sang Hoàn thành — KHÔNG xảy ra ngay tại bước chuyển đổi này.
 */
export async function convertToOrder(params: {
  id: string
  productId?: string
  phuongThucThanhToan: PaymentMethod
  kenhBan?: SalesChannel
  nguoiThucHienId: string
}) {
  const current = await prisma.preorder.findUnique({ where: { id: params.id } })
  if (!current) throw notFound("Không tìm thấy đơn đặt trước.")
  if (current.trangThai === "DA_CHUYEN_DON") throw badRequest("Đơn đặt trước này đã được chuyển thành đơn hàng.")
  if (current.trangThai === "DA_HUY") throw badRequest("Đơn đặt trước đã hủy, không thể chuyển thành đơn hàng.")

  const productId = current.productId ?? params.productId
  if (!productId) {
    throw badRequest(
      "Đơn đặt trước này cho sản phẩm mới chưa có trong catalog — hãy tạo sản phẩm đó trước, rồi truyền productId khi chuyển đơn.",
    )
  }

  const ghiChu =
    current.tienCoc > 0
      ? `Chuyển từ đơn đặt trước ${current.ma}. Đã đặt cọc ${current.tienCoc.toLocaleString("vi-VN")} VNĐ — cần thu thêm phần còn lại khi giao hàng.`
      : `Chuyển từ đơn đặt trước ${current.ma}.`

  // "Khóa" mềm (so-sánh-rồi-ghi, cùng kiểu compare-and-swap của
  // applyInventoryTransaction) TRƯỚC khi tạo Order — ordersService.create()
  // tự quản lý transaction riêng của nó nên không thể gộp chung một
  // transaction với bước cập nhật Preorder bên dưới; nếu không khóa trước,
  // 2 lượt gọi convertToOrder cùng lúc cho cùng 1 đơn đặt trước đều đọc được
  // trangThai còn hợp lệ và đều tạo Order xong, tạo ra 2 Order dùng chung một
  // khoản cọc chỉ được ghi Thu một lần. Chỉ lượt gọi nào khớp đúng trangThai
  // vừa đọc mới được đi tiếp — lượt còn lại nhận count=0 và dừng lại.
  const claim = await prisma.preorder.updateMany({
    where: { id: current.id, trangThai: current.trangThai },
    data: { trangThai: "DA_CHUYEN_DON" },
  })
  if (claim.count === 0) {
    throw conflict("Đơn đặt trước vừa được xử lý ở nơi khác (đã chuyển đổi hoặc bị hủy), vui lòng tải lại trang.")
  }

  try {
    const order = await ordersService.create({
      khachHangId: current.khachHangId,
      nhanVienId: params.nguoiThucHienId,
      kenhBan: params.kenhBan ?? "TAI_CUA_HANG",
      phuongThucThanhToan: params.phuongThucThanhToan,
      // Sao chép tiền cọc sang chính Order (không chỉ tham chiếu qua quan hệ
      // Preorder) để hóa đơn vẫn hiển thị đúng số cọc dù sau này Preorder gốc
      // bị xóa (xem preorders.service.ts#remove — nay xóa được ở mọi trạng thái).
      tienCoc: current.tienCoc,
      // Tiền cọc này đã được ghi Thu/Chi từ lúc tạo đơn đặt trước (create() ở
      // trên) — không ghi lại lần nữa khi chuyển đổi, tránh tính trùng dòng tiền.
      recordDepositIncome: false,
      ghiChu,
      items: [{ productId, soLuong: current.soLuong, giaOverride: current.donGiaDuKien, giamGia: 0 }],
      fallbackNhanVienId: params.nguoiThucHienId,
      excludePreorderIdFromReservation: current.id,
    })

    const preorder = await prisma.preorder.update({
      where: { id: current.id },
      data: { orderId: order.id, productId },
      include: preorderInclude,
    })

    return { preorder, order }
  } catch (err) {
    // Tạo Order thất bại (VD hết hàng) sau khi đã "khóa" đơn đặt trước ở
    // trên — trả lại đúng trạng thái ban đầu để đơn đặt trước không bị kẹt ở
    // DA_CHUYEN_DON mà không có Order thật đi kèm.
    await prisma.preorder.update({ where: { id: current.id }, data: { trangThai: current.trangThai } }).catch(() => {})
    throw err
  }
}
