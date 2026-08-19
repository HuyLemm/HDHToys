import { prisma } from "../lib/prisma.js"

const LIMIT = 5

export async function search(q: string) {
  if (q.length < 2) return { khachHang: [], donHang: [], hoaDon: [], sanPham: [] }

  const [khachHang, donHang, hoaDon, sanPham] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { hoTen: { contains: q, mode: "insensitive" } },
          { sdt: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, hoTen: true, sdt: true, email: true, hangKhachHang: true },
      take: LIMIT,
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { ma: { contains: q, mode: "insensitive" } },
          { khachHang: { hoTen: { contains: q, mode: "insensitive" } } },
          { khachHang: { sdt: { contains: q } } },
        ],
      },
      select: {
        id: true,
        ma: true,
        tongCong: true,
        trangThai: true,
        createdAt: true,
        khachHang: { select: { hoTen: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { soHoaDon: { contains: q, mode: "insensitive" } },
          { order: { ma: { contains: q, mode: "insensitive" } } },
          { order: { khachHang: { hoTen: { contains: q, mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        soHoaDon: true,
        createdAt: true,
        order: { select: { ma: true, tongCong: true, khachHang: { select: { hoTen: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { ten: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, ten: true, sku: true, tonKho: true, trangThai: true },
      take: LIMIT,
    }),
  ])

  return { khachHang, donHang, hoaDon, sanPham }
}
