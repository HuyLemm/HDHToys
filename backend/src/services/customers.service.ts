import type { CustomerTier, OrderStatus, Prisma, SalesChannel } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { badRequest, conflict, notFound } from "../errors/HttpError.js"

const ACTIVE_STATUSES: OrderStatus[] = ["MOI", "DANG_XU_LY"]

export async function list(params: {
  q?: string
  hangKhachHang?: CustomerTier
  nguonKhachHang?: SalesChannel
  page: number
  pageSize: number
}) {
  const { q, hangKhachHang, nguonKhachHang, page, pageSize } = params

  const where: Prisma.CustomerWhereInput = {
    ...(hangKhachHang ? { hangKhachHang } : {}),
    ...(nguonKhachHang ? { nguonKhachHang } : {}),
    ...(q
      ? {
          OR: [
            { hoTen: { contains: q, mode: "insensitive" } },
            { sdt: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.customer.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function get(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } })
  if (!customer) throw notFound("Không tìm thấy khách hàng.")
  return customer
}

export async function create(data: {
  hoTen: string
  sdt?: string
  email?: string
  ngaySinh?: Date
  diaChi?: string
  luuY?: string
  linkFacebook?: string
  nguonKhachHang: SalesChannel
  hangKhachHang: CustomerTier
}) {
  if (data.sdt) {
    const existing = await prisma.customer.findUnique({ where: { sdt: data.sdt } })
    if (existing) throw conflict("Số điện thoại đã tồn tại.")
  }
  return prisma.customer.create({ data })
}

export async function update(
  id: string,
  data: Partial<{
    hoTen: string
    sdt: string | null
    email: string | null
    ngaySinh: Date | null
    diaChi: string | null
    luuY: string | null
    linkFacebook: string | null
    nguonKhachHang: SalesChannel
    hangKhachHang: CustomerTier
    diemTichLuy: number
  }>,
) {
  if (data.sdt) {
    const existing = await prisma.customer.findUnique({ where: { sdt: data.sdt } })
    if (existing && existing.id !== id) throw conflict("Số điện thoại đã tồn tại.")
  }
  return prisma.customer.update({ where: { id }, data })
}

export async function remove(id: string) {
  await get(id)

  const orderCount = await prisma.order.count({ where: { khachHangId: id } })

  if (orderCount > 0) {
    throw badRequest("Không thể xóa khách hàng đã có đơn hàng — đây là lịch sử giao dịch cần giữ lại.")
  }

  // CustomerNote có onDelete: Cascade trong schema — tự động xóa theo khách hàng.
  await prisma.customer.delete({ where: { id } })
}

export async function removeNote(customerId: string, noteId: string) {
  const note = await prisma.customerNote.findUnique({ where: { id: noteId } })
  if (!note || note.customerId !== customerId) throw notFound("Không tìm thấy ghi chú.")
  await prisma.customerNote.delete({ where: { id: noteId } })
}

export async function getOverview(customerId: string) {
  const customer = await get(customerId)

  const [orders, activeOrders, completedItems] = await Promise.all([
    prisma.order.findMany({ where: { khachHangId: customerId }, select: { id: true, trangThai: true } }),
    prisma.order.findMany({
      where: { khachHangId: customerId, trangThai: { in: ACTIVE_STATUSES } },
      include: { items: { include: { product: { select: { id: true, sku: true, ten: true } } } } },
      relationLoadStrategy: "join",
      orderBy: { createdAt: "desc" },
    }),
    prisma.orderItem.findMany({
      where: { order: { khachHangId: customerId, trangThai: "HOAN_THANH" } },
      include: {
        product: { select: { id: true, sku: true, ten: true, danhMuc: true } },
        order: { select: { id: true, createdAt: true, tongCong: true } },
      },
    }),
  ])

  const completedOrderIds = new Set(completedItems.map((i) => i.order.id))
  const tongChiTieu = [...completedOrderIds].reduce((sum, orderId) => {
    const order = completedItems.find((i) => i.order.id === orderId)!.order
    return sum + order.tongCong
  }, 0)
  const tongDon = orders.length
  const soDonHoanThanh = completedOrderIds.size
  const giaTriDonTrungBinh = soDonHoanThanh > 0 ? Math.round(tongChiTieu / soDonHoanThanh) : 0
  const tongSanPhamDaMua = completedItems.reduce((sum, i) => sum + i.soLuong, 0)
  const donDangXuLy = activeOrders.length

  const byCategory = new Map<string, number>()
  const byProduct = new Map<string, { ten: string; sku: string; soLuong: number; lanMuaGanNhat: Date }>()
  for (const item of completedItems) {
    byCategory.set(item.product.danhMuc, (byCategory.get(item.product.danhMuc) ?? 0) + item.soLuong)
    const existing = byProduct.get(item.productId)
    if (existing) {
      existing.soLuong += item.soLuong
      if (item.order.createdAt > existing.lanMuaGanNhat) existing.lanMuaGanNhat = item.order.createdAt
    } else {
      byProduct.set(item.productId, {
        ten: item.product.ten,
        sku: item.product.sku,
        soLuong: item.soLuong,
        lanMuaGanNhat: item.order.createdAt,
      })
    }
  }

  const danhMucThuongMua = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([danhMuc]) => danhMuc)

  const sanPhamMuaNhieuNhat = [...byProduct.values()].sort((a, b) => b.soLuong - a.soLuong)[0] ?? null

  const lanMuaGanNhat =
    completedItems.length > 0 ? new Date(Math.max(...completedItems.map((i) => i.order.createdAt.getTime()))) : null

  return {
    customer,
    kpi: { tongChiTieu, tongDon, giaTriDonTrungBinh, tongSanPhamDaMua, donDangXuLy },
    danhMucThuongMua,
    sanPhamMuaNhieuNhat,
    lanMuaGanNhat,
    donDangXuLyHienTai: activeOrders,
  }
}

export async function getOrders(params: {
  customerId: string
  trangThai?: "active" | OrderStatus
  page: number
  pageSize: number
}) {
  const { customerId, trangThai, page, pageSize } = params

  const where: Prisma.OrderWhereInput = {
    khachHangId: customerId,
    ...(trangThai === "active" ? { trangThai: { in: ACTIVE_STATUSES } } : trangThai ? { trangThai } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: { include: { product: { select: { id: true, sku: true, ten: true } } } } },
      relationLoadStrategy: "join",
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function getProductsBought(customerId: string) {
  const items = await prisma.orderItem.findMany({
    where: { order: { khachHangId: customerId, trangThai: "HOAN_THANH" } },
    include: {
      product: { select: { id: true, sku: true, ten: true } },
      order: { select: { id: true, createdAt: true } },
    },
  })

  const byProduct = new Map<
    string,
    { productId: string; ten: string; sku: string; tongSoLuong: number; soLan: Set<string>; lanMuaGanNhat: Date; tongChiTieu: number }
  >()

  for (const item of items) {
    const existing = byProduct.get(item.productId)
    if (existing) {
      existing.tongSoLuong += item.soLuong
      existing.soLan.add(item.orderId)
      existing.tongChiTieu += item.thanhTien
      if (item.order.createdAt > existing.lanMuaGanNhat) existing.lanMuaGanNhat = item.order.createdAt
    } else {
      byProduct.set(item.productId, {
        productId: item.productId,
        ten: item.product.ten,
        sku: item.product.sku,
        tongSoLuong: item.soLuong,
        soLan: new Set([item.orderId]),
        lanMuaGanNhat: item.order.createdAt,
        tongChiTieu: item.thanhTien,
      })
    }
  }

  const result = [...byProduct.values()]
    .map((p) => ({
      productId: p.productId,
      ten: p.ten,
      sku: p.sku,
      tongSoLuong: p.tongSoLuong,
      soLanMua: p.soLan.size,
      lanMuaGanNhat: p.lanMuaGanNhat,
      tongChiTieu: p.tongChiTieu,
    }))
    .sort((a, b) => b.tongChiTieu - a.tongChiTieu)

  return { items: result, total: result.length }
}

export async function getInvoices(customerId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { order: { khachHangId: customerId } },
    include: { order: { select: { id: true, ma: true, tongCong: true, phuongThucThanhToan: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  })
  return { items: invoices, total: invoices.length }
}

export function getNotes(customerId: string) {
  return prisma.customerNote.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } })
}

export async function addNote(customerId: string, noiDung: string, nguoiTaoId: string) {
  await get(customerId)
  return prisma.customerNote.create({ data: { customerId, noiDung, nguoiTaoId } })
}
