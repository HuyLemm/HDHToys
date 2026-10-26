import { prisma } from "../lib/prisma.js"
import { startOfDay, endOfDay, startOfWeek } from "../lib/dateRange.js"
import { resolveDebtStatus } from "../lib/debtStatus.js"

/**
 * Quét các sản phẩm Pre-order có ngày dự kiến về rơi đúng hôm nay (giờ VN),
 * rồi lưu lại thành thông báo — mọi sản phẩm Pre-order đều tự động nhắc
 * (không có tùy chọn bật/tắt riêng), chỉ cần đã có ngày dự kiến. Không có
 * cron riêng — hàm này được gọi mỗi khi FE tải danh sách thông báo (list()
 * bên dưới), nên thông báo xuất hiện ngay lần đầu có ai mở app trong ngày
 * đó. Idempotent nhờ unique constraint (productId, loai, ngayApDung) trên
 * Notification — gọi lại nhiều lần trong cùng một ngày không tạo trùng.
 */
async function generateDueNotifications() {
  const now = new Date()
  const tuNgay = startOfDay(now)
  const denNgay = endOfDay(now)

  const dueProducts = await prisma.product.findMany({
    where: { loaiSanPham: "PRE_ORDER", ngayDuKienVe: { gte: tuNgay, lte: denNgay } },
    select: { id: true, sku: true, ten: true },
  })

  for (const p of dueProducts) {
    await prisma.notification.upsert({
      where: { productId_loai_ngayApDung: { productId: p.id, loai: "PREORDER_DEN_HAN", ngayApDung: tuNgay } },
      update: {},
      create: {
        loai: "PREORDER_DEN_HAN",
        tieuDe: "Hàng pre-order đến ngày dự kiến về",
        noiDung: `${p.ten} (${p.sku}) dự kiến về hàng hôm nay.`,
        productId: p.id,
        ngayApDung: tuNgay,
      },
    })
  }
}

/**
 * Nhắc thu công nợ phải thu quá hạn — quét 1 lần, gộp thành ĐÚNG 1 thông báo
 * mỗi tuần (không phải 1 thông báo/khoản nợ, kẻo spam) tóm tắt tổng số
 * khoản + tổng tiền còn phải thu. Không dùng unique constraint như
 * generateDueNotifications (productId null thì Postgres không coi 2 NULL là
 * trùng nên upsert theo productId không chặn được trùng) — kiểm tra bằng
 * findFirst trước khi tạo, chấp nhận được vì tần suất gọi thấp (không phải
 * đường găng), nhắc trùng vài giây hiếm khi xảy ra cũng không hại gì.
 */
async function generateDebtReminder() {
  const now = new Date()
  const weekStart = startOfWeek(now)

  const alreadySent = await prisma.notification.findFirst({
    where: { loai: "CONG_NO_QUA_HAN", ngayApDung: { gte: weekStart } },
    select: { id: true },
  })
  if (alreadySent) return

  const debts = await prisma.debt.findMany({ where: { loai: "PHAI_THU" }, select: { soTien: true, daThanhToan: true, ngayDenHan: true } })
  const overdue = debts
    .map((d) => ({ conLai: d.soTien - d.daThanhToan, trangThai: resolveDebtStatus(d.soTien - d.daThanhToan, d.ngayDenHan, now) }))
    .filter((d) => d.trangThai === "QUA_HAN")
  if (overdue.length === 0) return

  const tongConLai = overdue.reduce((sum, d) => sum + d.conLai, 0)
  await prisma.notification.create({
    data: {
      loai: "CONG_NO_QUA_HAN",
      tieuDe: "Công nợ phải thu quá hạn",
      noiDung: `${overdue.length} khoản phải thu đã quá hạn, tổng còn lại ${tongConLai.toLocaleString("vi-VN")} VNĐ — nhắc khách thanh toán.`,
      ngayApDung: weekStart,
    },
  })
}

export async function list(params: { page: number; pageSize: number }) {
  await generateDueNotifications()
  await generateDebtReminder()
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.notification.count(),
    prisma.notification.count({ where: { daDoc: false } }),
  ])
  return { items, total, page: params.page, pageSize: params.pageSize, unread }
}

export function markRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { daDoc: true } })
}

export async function markAllRead() {
  await prisma.notification.updateMany({ where: { daDoc: false }, data: { daDoc: true } })
}
