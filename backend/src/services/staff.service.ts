import type { StaffRole, StaffStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { hashPassword } from "../lib/auth.js"
import { conflict } from "../errors/HttpError.js"

const staffSelect = {
  id: true,
  hoTen: true,
  email: true,
  vaiTro: true,
  trangThai: true,
  createdAt: true,
} as const

export function list() {
  return prisma.staff.findMany({ select: staffSelect, orderBy: { createdAt: "asc" } })
}

export async function create(params: { hoTen: string; email: string; matKhau: string; vaiTro: StaffRole }) {
  const existing = await prisma.staff.findUnique({ where: { email: params.email } })
  if (existing) throw conflict("Email đã được sử dụng.")

  return prisma.staff.create({
    data: { hoTen: params.hoTen, email: params.email, vaiTro: params.vaiTro, matKhauHash: await hashPassword(params.matKhau) },
    select: staffSelect,
  })
}

export function update(id: string, data: Partial<{ hoTen: string; vaiTro: StaffRole; trangThai: StaffStatus }>) {
  return prisma.staff.update({ where: { id }, data, select: staffSelect })
}

export async function resetPassword(id: string, matKhauMoi: string) {
  await prisma.staff.update({ where: { id }, data: { matKhauHash: await hashPassword(matKhauMoi) } })
}
