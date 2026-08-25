import { prisma } from "../lib/prisma.js"
import { signToken, verifyPassword } from "../lib/auth.js"
import { notFound, unauthorized } from "../errors/HttpError.js"

// Bcrypt hash "giả" (không phải mật khẩu thật nào) — dùng để so sánh khi
// không tìm thấy tài khoản, để verifyPassword vẫn tốn đúng ~100ms như khi
// tìm thấy. Nếu không, email không tồn tại trả lời gần như tức thì còn email
// tồn tại luôn mất ~100ms bcrypt — chênh lệch thời gian phản hồi này lộ ra
// email nào có tài khoản trong hệ thống (timing side-channel).
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8G9c1xHwOXhVDS1Q9K.STVJvyfw.q2"

export async function login(email: string, matKhau: string) {
  const staff = await prisma.staff.findUnique({ where: { email } })
  const ok = await verifyPassword(matKhau, staff?.matKhauHash ?? DUMMY_HASH)
  if (!staff || staff.trangThai === "LOCKED" || !ok) throw unauthorized("Email hoặc mật khẩu không chính xác.")

  const token = signToken({ sub: staff.id, vaiTro: staff.vaiTro, tokenVersion: staff.tokenVersion })
  return { token, staff: { id: staff.id, hoTen: staff.hoTen, email: staff.email, vaiTro: staff.vaiTro } }
}

export async function me(staffId: string) {
  const staff = await prisma.staff.findUnique({ where: { id: staffId } })
  if (!staff) throw notFound("Không tìm thấy người dùng.")
  return { id: staff.id, hoTen: staff.hoTen, email: staff.email, vaiTro: staff.vaiTro, trangThai: staff.trangThai }
}
