import type { PaymentMethod, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { notFound } from "../errors/HttpError.js"

export const invoiceInclude = {
  nguoiTao: { select: { id: true, hoTen: true } },
  order: {
    include: {
      khachHang: { select: { id: true, hoTen: true, sdt: true, email: true } },
      nhanVien: { select: { id: true, hoTen: true } },
      items: { include: { product: { select: { id: true, sku: true, ten: true } } } },
    },
  },
} satisfies Prisma.InvoiceInclude

export async function list(params: {
  q?: string
  khachHangId?: string
  phuongThucThanhToan?: PaymentMethod
  nguoiTaoId?: string
  tuNgay?: Date
  denNgay?: Date
  page: number
  pageSize: number
}) {
  const { q, khachHangId, phuongThucThanhToan, nguoiTaoId, tuNgay, denNgay, page, pageSize } = params

  const where: Prisma.InvoiceWhereInput = {
    ...(nguoiTaoId ? { nguoiTaoId } : {}),
    ...(khachHangId ? { order: { khachHangId } } : {}),
    ...(phuongThucThanhToan ? { order: { phuongThucThanhToan } } : {}),
    ...(tuNgay || denNgay
      ? { createdAt: { ...(tuNgay ? { gte: tuNgay } : {}), ...(denNgay ? { lte: denNgay } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { soHoaDon: { contains: q, mode: "insensitive" } },
            { order: { ma: { contains: q, mode: "insensitive" } } },
            { order: { khachHang: { hoTen: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({ where, include: invoiceInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.invoice.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function get(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceInclude })
  if (!invoice) throw notFound("Không tìm thấy hóa đơn.")
  return invoice
}
