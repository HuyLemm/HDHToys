import type { StaffRole, StaffStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { hashPassword } from "../lib/auth.js"
import { PAYMENT_SYSTEM_STAFF_EMAIL } from "../lib/paymentConfig.js"
import { badRequest, conflict, notFound } from "../errors/HttpError.js"

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
  return prisma.staff.update({
    where: { id },
    // Khóa tài khoản (trangThai=LOCKED) tăng luôn tokenVersion — token đang
    // tồn tại của tài khoản này mất hiệu lực ngay ở lượt request kế tiếp,
    // không phải chờ hết hạn 8h (xem middleware/requireAuth.ts).
    data: data.trangThai === "LOCKED" ? { ...data, tokenVersion: { increment: 1 } } : data,
    select: staffSelect,
  })
}

/** Reset mật khẩu PHẢI vô hiệu hóa mọi token cũ (tokenVersion+1) — nếu không, kẻ chiếm được token trước khi Admin đổi mật khẩu vẫn dùng được tới hết 8h dù mật khẩu đã đổi. */
export async function resetPassword(id: string, matKhauMoi: string) {
  await prisma.staff.update({
    where: { id },
    data: { matKhauHash: await hashPassword(matKhauMoi), tokenVersion: { increment: 1 } },
  })
}

/**
 * Chỉ Admin được gọi (route-level requireRole). Staff gần như luôn được
 * tham chiếu (nhanVienId trên Order, nguoiTaoId trên Invoice/IncomeExpense,
 * nguoiThucHienId trên InventoryTransaction — đều là FK bắt buộc, không
 * cascade) — nên chỉ xóa được nếu tài khoản đó chưa hề tạo/xử lý gì. Trường
 * hợp phổ biến hơn (nhân viên đã dùng hệ thống) vẫn nên dùng "Khóa tài
 * khoản" (trangThai=LOCKED) như trước.
 */
export async function remove(id: string, currentStaffId: string) {
  const staff = await prisma.staff.findUnique({ where: { id } })
  if (!staff) throw notFound("Không tìm thấy nhân viên.")
  if (id === currentStaffId) throw badRequest("Không thể tự xóa tài khoản của chính mình.")
  if (staff.email === PAYMENT_SYSTEM_STAFF_EMAIL) {
    throw badRequest("Đây là tài khoản hệ thống dùng cho thanh toán tự động — không thể xóa.")
  }

  const [orderCount, invoiceCount, inventoryCount, incomeExpenseCount] = await Promise.all([
    prisma.order.count({ where: { nhanVienId: id } }),
    prisma.invoice.count({ where: { nguoiTaoId: id } }),
    prisma.inventoryTransaction.count({ where: { nguoiThucHienId: id } }),
    prisma.incomeExpense.count({ where: { nguoiTaoId: id } }),
  ])
  if (orderCount || invoiceCount || inventoryCount || incomeExpenseCount) {
    throw badRequest("Nhân viên này đã tạo/xử lý dữ liệu trong hệ thống — không thể xóa, hãy dùng 'Khóa tài khoản' thay thế.")
  }

  await prisma.staff.delete({ where: { id } })
}
