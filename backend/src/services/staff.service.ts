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
  return prisma.staff.update({ where: { id }, data, select: staffSelect })
}

export async function resetPassword(id: string, matKhauMoi: string) {
  await prisma.staff.update({ where: { id }, data: { matKhauHash: await hashPassword(matKhauMoi) } })
}

/**
 * Chỉ Admin được gọi (route-level requireRole). Staff gần như luôn được
 * tham chiếu (nhanVienId trên Order, nguoiTaoId trên Invoice/IncomeExpense,
 * nguoiThucHienId trên InventoryTransaction, nhanVienId trên Preorder — đều
 * là FK bắt buộc, không cascade) — nên chỉ xóa được nếu tài khoản đó chưa hề
 * tạo/xử lý gì. Trường hợp phổ biến hơn (nhân viên đã dùng hệ thống) vẫn nên
 * dùng "Khóa tài khoản" (trangThai=LOCKED) như trước.
 */
export async function remove(id: string, currentStaffId: string) {
  const staff = await prisma.staff.findUnique({ where: { id } })
  if (!staff) throw notFound("Không tìm thấy nhân viên.")
  if (id === currentStaffId) throw badRequest("Không thể tự xóa tài khoản của chính mình.")
  if (staff.email === PAYMENT_SYSTEM_STAFF_EMAIL) {
    throw badRequest("Đây là tài khoản hệ thống dùng cho thanh toán tự động — không thể xóa.")
  }

  const [orderCount, invoiceCount, inventoryCount, incomeExpenseCount, preorderCount] = await Promise.all([
    prisma.order.count({ where: { nhanVienId: id } }),
    prisma.invoice.count({ where: { nguoiTaoId: id } }),
    prisma.inventoryTransaction.count({ where: { nguoiThucHienId: id } }),
    prisma.incomeExpense.count({ where: { nguoiTaoId: id } }),
    prisma.preorder.count({ where: { nhanVienId: id } }),
  ])
  if (orderCount || invoiceCount || inventoryCount || incomeExpenseCount || preorderCount) {
    throw badRequest("Nhân viên này đã tạo/xử lý dữ liệu trong hệ thống — không thể xóa, hãy dùng 'Khóa tài khoản' thay thế.")
  }

  await prisma.staff.delete({ where: { id } })
}
