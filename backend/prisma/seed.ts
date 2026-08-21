import { randomBytes } from "node:crypto"
import { prisma } from "../src/lib/prisma.js"
import { hashPassword } from "../src/lib/auth.js"
import { PAYMENT_SYSTEM_STAFF_EMAIL } from "../src/lib/paymentConfig.js"

async function seedAdmin() {
  const email = "admin@hdhtoys.vn"
  const existing = await prisma.staff.findUnique({ where: { email } })
  if (existing) {
    console.log("Admin đã tồn tại, bỏ qua seed.")
    return
  }

  await prisma.staff.create({
    data: {
      hoTen: "Admin HDH Toys",
      email,
      matKhauHash: await hashPassword("admin123"),
      vaiTro: "ADMIN",
    },
  })
  console.log(`Đã tạo tài khoản admin: ${email} / admin123`)
}

/**
 * Tài khoản đại diện "hệ thống", dùng làm nguoiTaoId/nguoiThucHienId cho các
 * bản ghi (Invoice, InventoryTransaction) do webhook đối soát thanh toán QR
 * tự tạo ra — vì hai cột này là FK bắt buộc tới Staff (SDS mục 5.8 điểm 3).
 * Luôn ở trạng thái LOCKED + mật khẩu ngẫu nhiên không ai biết, để không ai
 * đăng nhập được bằng tài khoản này.
 */
async function seedPaymentSystemStaff() {
  const existing = await prisma.staff.findUnique({ where: { email: PAYMENT_SYSTEM_STAFF_EMAIL } })
  if (existing) {
    console.log("Tài khoản hệ thống (thanh toán tự động) đã tồn tại, bỏ qua seed.")
    return
  }

  await prisma.staff.create({
    data: {
      hoTen: "Hệ thống (Thanh toán tự động)",
      email: PAYMENT_SYSTEM_STAFF_EMAIL,
      matKhauHash: await hashPassword(randomBytes(32).toString("hex")),
      vaiTro: "ADMIN",
      trangThai: "LOCKED",
    },
  })
  console.log(`Đã tạo tài khoản hệ thống: ${PAYMENT_SYSTEM_STAFF_EMAIL} (LOCKED, không đăng nhập được)`)
}

async function main() {
  await seedAdmin()
  await seedPaymentSystemStaff()
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
