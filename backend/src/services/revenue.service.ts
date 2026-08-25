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
      // Bó theo hoanTienAt (mốc thời gian đơn thực sự chuyển sang Hoàn tiền),
      // KHÔNG phải createdAt (ngày tạo đơn ban đầu) — nếu không, một đơn tạo
      // hôm nay nhưng hoàn tiền nhiều tuần sau sẽ hiện sai (hoặc mất hẳn) ở cả
      // 2 báo cáo, và báo cáo của ngày tạo đơn (đã "chốt" từ lâu) sẽ tự đổi số
      // âm thầm khi chạy lại sau khi đơn đó bị hoàn tiền.
      where: { trangThai: "HOAN_TIEN", hoanTienAt: { gte: tuNgay, lte: denNgay } },
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

  const byCategory = new Map<string, { doanhThu: number; giaVon: number }>()
  for (const i of items) {
    const bucket = byCategory.get(i.product.danhMuc) ?? { doanhThu: 0, giaVon: 0 }
    bucket.doanhThu += i.thanhTien
    bucket.giaVon += i.soLuong * i.giaVon
    byCategory.set(i.product.danhMuc, bucket)
  }

  return {
    items: [...byCategory.entries()]
      .map(([danhMuc, v]) => ({ danhMuc, doanhThu: v.doanhThu, giaVon: v.giaVon, loiNhuan: v.doanhThu - v.giaVon }))
      .sort((a, b) => b.doanhThu - a.doanhThu),
  }
}

export async function getByProduct(tuNgay: Date, denNgay: Date) {
  const items = await prisma.orderItem.findMany({
    where: { order: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } } },
    include: { product: { select: { id: true, sku: true, ten: true } } },
  })

  const byProduct = new Map<string, { ten: string; sku: string; soLuong: number; doanhThu: number; giaVon: number }>()
  for (const i of items) {
    const existing = byProduct.get(i.productId)
    if (existing) {
      existing.soLuong += i.soLuong
      existing.doanhThu += i.thanhTien
      existing.giaVon += i.soLuong * i.giaVon
    } else {
      byProduct.set(i.productId, { ten: i.product.ten, sku: i.product.sku, soLuong: i.soLuong, doanhThu: i.thanhTien, giaVon: i.soLuong * i.giaVon })
    }
  }

  return {
    items: [...byProduct.values()]
      .map((p) => ({ ...p, loiNhuan: p.doanhThu - p.giaVon }))
      .sort((a, b) => b.doanhThu - a.doanhThu),
  }
}

/**
 * Vòng quay tồn kho theo sản phẩm — ước tính đơn giản (số lượng bán trong kỳ
 * / tồn kho hiện tại), KHÔNG phải công thức chuẩn (thường dùng tồn kho trung
 * bình theo từng mốc thời gian, nhưng hệ thống chưa lưu lịch sử tồn kho theo
 * ngày). Chỉ dùng để so sánh tương đối sản phẩm nào bán nhanh/chậm, không
 * phải số liệu kế toán chính xác.
 */
export async function getInventoryTurnover(tuNgay: Date, denNgay: Date) {
  const [soldItems, products] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } } },
      select: { productId: true, soLuong: true },
    }),
    prisma.product.findMany({
      where: { trangThai: { not: "NGUNG_KINH_DOANH" } },
      select: { id: true, sku: true, ten: true, tonKho: true },
    }),
  ])

  const soldByProduct = new Map<string, number>()
  for (const i of soldItems) soldByProduct.set(i.productId, (soldByProduct.get(i.productId) ?? 0) + i.soLuong)

  const items = products.map((p) => {
    const soLuongBan = soldByProduct.get(p.id) ?? 0
    return {
      productId: p.id,
      sku: p.sku,
      ten: p.ten,
      tonKho: p.tonKho,
      soLuongBan,
      // null = hết hàng (tonKho = 0) — không chia được, không phải "0 vòng quay".
      vongQuay: p.tonKho > 0 ? Number((soLuongBan / p.tonKho).toFixed(2)) : null,
    }
  })

  return {
    // Bán chậm nhất trước (vongQuay thấp = tồn lâu) — sản phẩm hết hàng (null) xếp cuối vì không phải "chậm".
    items: items.sort((a, b) => (a.vongQuay ?? Infinity) - (b.vongQuay ?? Infinity)),
  }
}

/**
 * Khách mua lại trong kỳ — đếm theo số đơn Hoàn thành, không phải số lượt
 * tương tác (nhắn hỏi, đặt trước...). soDon >= 2 mới tính là "mua lại".
 */
export async function getRepeatCustomers(tuNgay: Date, denNgay: Date) {
  const orders = await prisma.order.findMany({
    where: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } },
    select: { khachHangId: true, tongCong: true, khachHang: { select: { hoTen: true, sdt: true } } },
  })

  const byCustomer = new Map<string, { hoTen: string; sdt: string; soDon: number; tongChiTieu: number }>()
  for (const o of orders) {
    const bucket = byCustomer.get(o.khachHangId) ?? { hoTen: o.khachHang.hoTen, sdt: o.khachHang.sdt, soDon: 0, tongChiTieu: 0 }
    bucket.soDon += 1
    bucket.tongChiTieu += o.tongCong
    byCustomer.set(o.khachHangId, bucket)
  }

  const all = [...byCustomer.values()]
  const repeat = all.filter((c) => c.soDon >= 2).sort((a, b) => b.soDon - a.soDon || b.tongChiTieu - a.tongChiTieu)

  return {
    tongKhachHang: all.length,
    khachMuaLai: repeat.length,
    tyLeMuaLai: all.length > 0 ? Number(((repeat.length / all.length) * 100).toFixed(1)) : 0,
    items: repeat,
  }
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
      where: { trangThai: "HOAN_TIEN", hoanTienAt: { gte: tuNgay, lte: denNgay } },
      select: { hoanTienAt: true, tongCong: true },
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
  for (const o of refundedOrders) bucketFor(dayKey(o.hoanTienAt!)).hoanTien += o.tongCong

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
