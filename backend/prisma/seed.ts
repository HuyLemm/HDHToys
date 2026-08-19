import { prisma } from "../src/lib/prisma.js"
import { hashPassword } from "../src/lib/auth.js"

async function main() {
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

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
