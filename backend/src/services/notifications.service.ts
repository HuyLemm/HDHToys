import { prisma } from "../lib/prisma.js"
import { startOfDay, endOfDay } from "../lib/dateRange.js"

/**
 * Quét các sản phẩm Pre-order có bật nhắc hàng (nhacHang=true) và ngày dự
 * kiến về rơi đúng hôm nay (giờ VN), rồi lưu lại thành thông báo. Không có
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
    where: { loaiSanPham: "PRE_ORDER", nhacHang: true, ngayDuKienVe: { gte: tuNgay, lte: denNgay } },
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

export async function list(params: { page: number; pageSize: number }) {
  await generateDueNotifications()
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
