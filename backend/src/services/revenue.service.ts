import { prisma } from "../lib/prisma.js"
import { resolveDateRange, type RangeKey } from "../lib/dateRange.js"

function dayKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }) // YYYY-MM-DD
}

export function resolveRange(range: RangeKey, tuNgay?: Date, denNgay?: Date) {
  return resolveDateRange(range, tuNgay, denNgay)
}

export async function getSummary(tuNgay: Date, denNgay: Date) {
  const [completedOrders, refundedOrders] = await Promise.all([
    prisma.order.findMany({
      where: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: { trangThai: "HOAN_TIEN", createdAt: { gte: tuNgay, lte: denNgay } },
      select: { tongCong: true },
    }),
  ])

  const tongDoanhThu = completedOrders.reduce((sum, o) => sum + o.tongCong, 0)
  const tongSoDon = completedOrders.length
  const giaTriDonTrungBinh = tongSoDon > 0 ? Math.round(tongDoanhThu / tongSoDon) : 0
  const tongGiamGia = completedOrders.reduce((sum, o) => sum + o.giamGia, 0)
  const loiNhuanGop = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + (i.thanhTien - i.soLuong * i.giaVon), 0),
    0,
  )
  const tongHoanTien = refundedOrders.reduce((sum, o) => sum + o.tongCong, 0)

  return { tongDoanhThu, tongSoDon, giaTriDonTrungBinh, loiNhuanGop, tongGiamGia, tongHoanTien }
}

export async function getByTime(tuNgay: Date, denNgay: Date) {
  const orders = await prisma.order.findMany({
    where: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } },
    select: { createdAt: true, tongCong: true },
  })

  const byDay = new Map<string, { doanhThu: number; soDon: number }>()
  for (const o of orders) {
    const key = dayKey(o.createdAt)
    const bucket = byDay.get(key) ?? { doanhThu: 0, soDon: 0 }
    bucket.doanhThu += o.tongCong
    bucket.soDon += 1
    byDay.set(key, bucket)
  }

  return { items: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ngay, v]) => ({ ngay, ...v })) }
}

export async function getByCategory(tuNgay: Date, denNgay: Date) {
  const items = await prisma.orderItem.findMany({
    where: { order: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } } },
    include: { product: { select: { danhMuc: true } } },
  })

  const byCategory = new Map<string, number>()
  for (const i of items) byCategory.set(i.product.danhMuc, (byCategory.get(i.product.danhMuc) ?? 0) + i.thanhTien)

  return {
    items: [...byCategory.entries()].map(([danhMuc, doanhThu]) => ({ danhMuc, doanhThu })).sort((a, b) => b.doanhThu - a.doanhThu),
  }
}

export async function getByProduct(tuNgay: Date, denNgay: Date) {
  const items = await prisma.orderItem.findMany({
    where: { order: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } } },
    include: { product: { select: { id: true, sku: true, ten: true } } },
  })

  const byProduct = new Map<string, { ten: string; sku: string; soLuong: number; doanhThu: number }>()
  for (const i of items) {
    const existing = byProduct.get(i.productId)
    if (existing) {
      existing.soLuong += i.soLuong
      existing.doanhThu += i.thanhTien
    } else {
      byProduct.set(i.productId, { ten: i.product.ten, sku: i.product.sku, soLuong: i.soLuong, doanhThu: i.thanhTien })
    }
  }

  return { items: [...byProduct.values()].sort((a, b) => b.doanhThu - a.doanhThu) }
}

export async function getByStaff(tuNgay: Date, denNgay: Date) {
  const orders = await prisma.order.findMany({
    where: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } },
    include: { nhanVien: { select: { id: true, hoTen: true } } },
  })

  const byStaff = new Map<string, { hoTen: string; doanhThu: number; soDon: number }>()
  for (const o of orders) {
    const existing = byStaff.get(o.nhanVienId)
    if (existing) {
      existing.doanhThu += o.tongCong
      existing.soDon += 1
    } else {
      byStaff.set(o.nhanVienId, { hoTen: o.nhanVien.hoTen, doanhThu: o.tongCong, soDon: 1 })
    }
  }

  return { items: [...byStaff.values()].sort((a, b) => b.doanhThu - a.doanhThu) }
}

export async function getByPaymentMethod(tuNgay: Date, denNgay: Date) {
  const orders = await prisma.order.findMany({
    where: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } },
    select: { phuongThucThanhToan: true, tongCong: true },
  })

  const byMethod = new Map<string, { doanhThu: number; soDon: number }>()
  for (const o of orders) {
    const bucket = byMethod.get(o.phuongThucThanhToan) ?? { doanhThu: 0, soDon: 0 }
    bucket.doanhThu += o.tongCong
    bucket.soDon += 1
    byMethod.set(o.phuongThucThanhToan, bucket)
  }

  return { items: [...byMethod.entries()].map(([phuongThuc, v]) => ({ phuongThuc, ...v })) }
}

interface DetailRow {
  ngay: string
  soDon: number
  doanhThu: number
  giamGia: number
  hoanTien: number
  giaVon: number
  loiNhuanGop: number
}

async function getDetailRows(tuNgay: Date, denNgay: Date): Promise<DetailRow[]> {
  const [completedOrders, refundedOrders] = await Promise.all([
    prisma.order.findMany({
      where: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: { trangThai: "HOAN_TIEN", createdAt: { gte: tuNgay, lte: denNgay } },
      select: { createdAt: true, tongCong: true },
    }),
  ])

  const byDay = new Map<string, DetailRow>()
  function bucketFor(key: string) {
    let bucket = byDay.get(key)
    if (!bucket) {
      bucket = { ngay: key, soDon: 0, doanhThu: 0, giamGia: 0, hoanTien: 0, giaVon: 0, loiNhuanGop: 0 }
      byDay.set(key, bucket)
    }
    return bucket
  }

  for (const o of completedOrders) {
    const bucket = bucketFor(dayKey(o.createdAt))
    bucket.soDon += 1
    bucket.doanhThu += o.tongCong
    bucket.giamGia += o.giamGia
    const giaVonDon = o.items.reduce((s, i) => s + i.soLuong * i.giaVon, 0)
    bucket.giaVon += giaVonDon
    bucket.loiNhuanGop += o.tongCong - giaVonDon
  }
  for (const o of refundedOrders) bucketFor(dayKey(o.createdAt)).hoanTien += o.tongCong

  return [...byDay.values()]
}

export async function getDetail(tuNgay: Date, denNgay: Date, page: number, pageSize: number) {
  const allDays = (await getDetailRows(tuNgay, denNgay)).sort((a, b) => b.ngay.localeCompare(a.ngay))
  const total = allDays.length
  const items = allDays.slice((page - 1) * pageSize, page * pageSize)
  return { items, total, page, pageSize }
}

export async function exportCsv(tuNgay: Date, denNgay: Date) {
  const rows = (await getDetailRows(tuNgay, denNgay)).sort((a, b) => a.ngay.localeCompare(b.ngay))
  const header = "Ngay,So don,Doanh thu,Giam gia,Gia von,Loi nhuan gop"
  const lines = rows.map((v) => `${v.ngay},${v.soDon},${v.doanhThu},${v.giamGia},${v.giaVon},${v.loiNhuanGop}`)
  return [header, ...lines].join("\n")
}
