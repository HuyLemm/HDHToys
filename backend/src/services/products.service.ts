import type { Prisma, ProductStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { resolveStockStatus } from "../lib/productStatus.js"
import { conflict, notFound } from "../errors/HttpError.js"

export async function list(params: {
  q?: string
  danhMuc?: string
  nhaCungCap?: string
  trangThai?: ProductStatus
  page: number
  pageSize: number
}) {
  const { q, danhMuc, nhaCungCap, trangThai, page, pageSize } = params

  const where: Prisma.ProductWhereInput = {
    ...(danhMuc ? { danhMuc } : {}),
    ...(nhaCungCap ? { nhaCungCap } : {}),
    ...(trangThai ? { trangThai } : {}),
    ...(q
      ? {
          OR: [
            { ten: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function get(id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw notFound("Không tìm thấy sản phẩm.")
  return product
}

export async function create(data: {
  sku: string
  ten: string
  barcode?: string
  danhMuc: string
  nhaCungCap: string
  anhUrl?: string
  giaVon: number
  giaBan: number
  tonKho: number
  tonKhoToiThieu: number
}) {
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } })
  if (existing) throw conflict("SKU đã tồn tại.")

  return prisma.product.create({
    data: { ...data, trangThai: resolveStockStatus(data.tonKho, data.tonKhoToiThieu, "CON_HANG") },
  })
}

export async function update(
  id: string,
  data: Partial<{
    ten: string
    barcode: string
    danhMuc: string
    nhaCungCap: string
    anhUrl: string
    giaVon: number
    giaBan: number
    tonKhoToiThieu: number
  }>,
) {
  const current = await get(id)
  const tonKhoToiThieu = data.tonKhoToiThieu ?? current.tonKhoToiThieu

  return prisma.product.update({
    where: { id },
    data: { ...data, trangThai: resolveStockStatus(current.tonKho, tonKhoToiThieu, current.trangThai) },
  })
}

export function discontinue(id: string) {
  return prisma.product.update({ where: { id }, data: { trangThai: "NGUNG_KINH_DOANH" as ProductStatus } })
}

export async function reactivate(id: string) {
  const current = await get(id)
  return prisma.product.update({
    where: { id },
    data: { trangThai: resolveStockStatus(current.tonKho, current.tonKhoToiThieu, "CON_HANG") },
  })
}
