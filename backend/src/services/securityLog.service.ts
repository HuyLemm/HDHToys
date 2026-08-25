import { prisma } from "../lib/prisma.js"

export async function list(params: { event?: string; page: number; pageSize: number }) {
  const where = params.event ? { event: params.event } : {}
  const [items, total] = await Promise.all([
    prisma.securityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.securityLog.count({ where }),
  ])
  return { items, total, page: params.page, pageSize: params.pageSize }
}

/** Danh sách loại sự kiện đã từng xảy ra — dùng để đổ vào dropdown lọc trên UI. */
export async function listEventTypes() {
  const rows = await prisma.securityLog.findMany({ distinct: ["event"], select: { event: true }, orderBy: { event: "asc" } })
  return rows.map((r) => r.event)
}
