import type { DebtType, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { serializeDebt, type DebtStatus } from "../lib/debtStatus.js"
import { badRequest, notFound } from "../errors/HttpError.js"

export async function list(params: { loai?: DebtType; trangThai?: DebtStatus; q?: string; page: number; pageSize: number }) {
  const { loai, trangThai, q, page, pageSize } = params

  const where: Prisma.DebtWhereInput = {
    ...(loai ? { loai } : {}),
    ...(q ? { doiTuong: { contains: q, mode: "insensitive" } } : {}),
  }

  const all = await prisma.debt.findMany({ where, orderBy: { ngayDenHan: "asc" } })
  const serialized = all.map(serializeDebt)
  const filtered = trangThai ? serialized.filter((d) => d.trangThai === trangThai) : serialized

  const total = filtered.length
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)

  return { items, total, page, pageSize }
}

export async function getSummary() {
  const all = await prisma.debt.findMany()
  const serialized = all.map(serializeDebt)

  const sum = (loai: "PHAI_THU" | "PHAI_TRA", onlyOverdue = false) =>
    serialized.filter((d) => d.loai === loai && (!onlyOverdue || d.trangThai === "QUA_HAN")).reduce((s, d) => s + d.conLai, 0)

  return {
    tongPhaiThu: sum("PHAI_THU"),
    quaHanPhaiThu: sum("PHAI_THU", true),
    tongPhaiTra: sum("PHAI_TRA"),
    quaHanPhaiTra: sum("PHAI_TRA", true),
  }
}

export async function get(id: string) {
  const debt = await prisma.debt.findUnique({ where: { id } })
  if (!debt) throw notFound("Không tìm thấy khoản công nợ.")
  return serializeDebt(debt)
}

export async function create(data: {
  doiTuong: string
  loai: DebtType
  ngayPhatSinh: Date
  ngayDenHan: Date
  soTien: number
  daThanhToan: number
}) {
  if (data.daThanhToan > data.soTien) throw badRequest("Số tiền đã thanh toán không được vượt quá tổng số tiền.")
  const debt = await prisma.debt.create({ data })
  return serializeDebt(debt)
}

export async function update(id: string, data: Partial<{ doiTuong: string; ngayDenHan: Date; soTien: number }>) {
  const debt = await prisma.debt.update({ where: { id }, data })
  return serializeDebt(debt)
}

export async function pay(id: string, soTien: number) {
  const current = await prisma.debt.findUnique({ where: { id } })
  if (!current) throw notFound("Không tìm thấy khoản công nợ.")

  const daThanhToanMoi = current.daThanhToan + soTien
  if (daThanhToanMoi > current.soTien) throw badRequest("Số tiền thanh toán vượt quá số tiền còn lại.")

  const debt = await prisma.debt.update({ where: { id }, data: { daThanhToan: daThanhToanMoi } })
  return serializeDebt(debt)
}

export async function remove(id: string) {
  const current = await prisma.debt.findUnique({ where: { id } })
  if (!current) throw notFound("Không tìm thấy khoản công nợ.")
  await prisma.debt.delete({ where: { id } })
}
