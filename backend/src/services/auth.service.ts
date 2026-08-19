import { prisma } from "../lib/prisma.js"
import { signToken, verifyPassword } from "../lib/auth.js"
import { notFound, unauthorized } from "../errors/HttpError.js"

export async function login(email: string, matKhau: string) {
  const staff = await prisma.staff.findUnique({ where: { email } })
  if (!staff || staff.trangThai === "LOCKED") throw unauthorized("Email hoặc mật khẩu không chính xác.")

  const ok = await verifyPassword(matKhau, staff.matKhauHash)
  if (!ok) throw unauthorized("Email hoặc mật khẩu không chính xác.")

  const token = signToken({ sub: staff.id, vaiTro: staff.vaiTro })
  return { token, staff: { id: staff.id, hoTen: staff.hoTen, email: staff.email, vaiTro: staff.vaiTro } }
}

export async function me(staffId: string) {
  const staff = await prisma.staff.findUnique({ where: { id: staffId } })
  if (!staff) throw notFound("Không tìm thấy người dùng.")
  return { id: staff.id, hoTen: staff.hoTen, email: staff.email, vaiTro: staff.vaiTro, trangThai: staff.trangThai }
}
