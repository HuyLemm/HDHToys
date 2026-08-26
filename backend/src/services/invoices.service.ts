import type { PaymentMethod, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { notFound } from "../errors/HttpError.js"

export const invoiceInclude = {
  nguoiTao: { select: { id: true, hoTen: true } },
  order: {
    include: {
      khachHang: { select: { id: true, hoTen: true, sdt: true, email: true, diaChi: true } },
      nhanVien: { select: { id: true, hoTen: true } },
      items: { include: { product: { select: { id: true, sku: true, ten: true, loaiSanPham: true } } } },
      // Chỉ lấy giao dịch ngân hàng khớp gần nhất để in "Mã giao dịch" —
      // hóa đơn không cần toàn bộ lịch sử đối soát của đơn hàng.
      paymentTransactions: { select: { maGiaoDichNganHang: true }, orderBy: { createdAt: "desc" }, take: 1 },
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
    prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      // order.items là quan hệ 1-nhiều lồng 2 cấp — gộp về 1 SQL JOIN thay vì
      // nhiều round-trip riêng (xem giải thích ở orders.service.ts).
      relationLoadStrategy: "join",
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function get(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceInclude, relationLoadStrategy: "join" })
  if (!invoice) throw notFound("Không tìm thấy hóa đơn.")
  return invoice
}

/**
 * Chỉ Admin được gọi (route-level requireRole). Đi ngược lại nguyên tắc
 * "hóa đơn không được sửa/xóa sau khi phát hành" (SRS FR-INVO.2) — chấp nhận
 * đánh đổi này theo yêu cầu, giới hạn ở vai trò Admin. Không có bảng nào FK
 * tới Invoice nên xóa không làm vỡ ràng buộc DB; đơn hàng gốc vẫn giữ
 * nguyên, chỉ mất liên kết hóa đơn.
 */
export async function remove(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) throw notFound("Không tìm thấy hóa đơn.")
  await prisma.invoice.delete({ where: { id } })
}
