import type { OrderStatus, PaymentMethod, Prisma, SalesChannel } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { canTransition, formatOrderCode } from "../lib/orderCode.js"
import { formatInvoiceCode } from "../lib/invoiceCode.js"
import { applyInventoryTransaction } from "./inventory.service.js"
import { badRequest, notFound } from "../errors/HttpError.js"

export const orderInclude = {
  khachHang: { select: { id: true, hoTen: true, sdt: true, email: true } },
  nhanVien: { select: { id: true, hoTen: true } },
  items: { include: { product: { select: { id: true, sku: true, ten: true } } } },
} satisfies Prisma.OrderInclude

export async function list(params: {
  q?: string
  trangThai?: OrderStatus
  khachHangId?: string
  nhanVienId?: string
  phuongThucThanhToan?: PaymentMethod
  tuNgay?: Date
  denNgay?: Date
  page: number
  pageSize: number
}) {
  const { q, trangThai, khachHangId, nhanVienId, phuongThucThanhToan, tuNgay, denNgay, page, pageSize } = params

  const where: Prisma.OrderWhereInput = {
    ...(trangThai ? { trangThai } : {}),
    ...(khachHangId ? { khachHangId } : {}),
    ...(nhanVienId ? { nhanVienId } : {}),
    ...(phuongThucThanhToan ? { phuongThucThanhToan } : {}),
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
    prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.order.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function get(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude })
  if (!order) throw notFound("Không tìm thấy đơn hàng.")
  return order
}

interface OrderItemInput {
  productId: string
  soLuong: number
  giaOverride?: number
  giamGia: number
}

export async function create(params: {
  khachHangId: string
  nhanVienId?: string
  kenhBan: SalesChannel
  phuongThucThanhToan: PaymentMethod
  vat: number
  ghiChu?: string
  items: OrderItemInput[]
  fallbackNhanVienId: string
}) {
  const { khachHangId, nhanVienId, kenhBan, phuongThucThanhToan, vat, ghiChu, items, fallbackNhanVienId } = params

  const customer = await prisma.customer.findUnique({ where: { id: khachHangId } })
  if (!customer) throw badRequest("Khách hàng không tồn tại.")

  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } })
  const productMap = new Map(products.map((p) => [p.id, p]))
  if (products.length !== new Set(items.map((i) => i.productId)).size) throw badRequest("Có sản phẩm không tồn tại.")

  const lines = items.map((item) => {
    const product = productMap.get(item.productId)!
    const donGia = item.giaOverride ?? product.giaBan
    const thanhTien = item.soLuong * donGia - item.giamGia
    return { ...item, donGia, giaVon: product.giaVon, thanhTien }
  })

  const tamTinh = lines.reduce((sum, l) => sum + l.soLuong * l.donGia, 0)
  const giamGiaTong = lines.reduce((sum, l) => sum + l.giamGia, 0)
  const tongCong = tamTinh - giamGiaTong + vat

  return prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        ma: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        khachHangId,
        nhanVienId: nhanVienId ?? fallbackNhanVienId,
        kenhBan,
        phuongThucThanhToan,
        vat,
        ghiChu,
        tamTinh,
        giamGia: giamGiaTong,
        tongCong,
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

    return tx.order.update({
      where: { id: created.id },
      data: { ma: formatOrderCode(created.soThuTu, created.createdAt) },
      include: orderInclude,
    })
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
      for (const item of current.items) {
        await tx.product.update({ where: { id: item.productId }, data: { daBan: { increment: item.soLuong } } })
        await applyInventoryTransaction(tx, {
          productId: item.productId,
          loai: "XUAT",
          soLuongThayDoi: -item.soLuong,
          nguoiThucHienId,
          thamChieu: current.ma,
          ghiChu: "Xuất theo đơn hàng",
        })
      }

      const createdInvoice = await tx.invoice.create({
        data: {
          soHoaDon: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          orderId: current.id,
          nguoiTaoId: nguoiThucHienId,
        },
      })
      await tx.invoice.update({
        where: { id: createdInvoice.id },
        data: { soHoaDon: formatInvoiceCode(createdInvoice.soThuTu, createdInvoice.createdAt) },
      })
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
    }

    return tx.order.update({ where: { id: orderId }, data: { trangThai }, include: orderInclude })
  })
}
