import { prisma } from "../lib/prisma.js"
import { serializeDebt } from "../lib/debtStatus.js"
import { resolveDateRange } from "../lib/dateRange.js"

async function getOrCreateBalance() {
  return prisma.accountingBalance.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } })
}

async function getDebtTotals() {
  const debts = await prisma.debt.findMany()
  const serialized = debts.map(serializeDebt)
  return {
    congNoPhaiThu: serialized.filter((d) => d.loai === "PHAI_THU").reduce((s, d) => s + d.conLai, 0),
    congNoPhaiTra: serialized.filter((d) => d.loai === "PHAI_TRA").reduce((s, d) => s + d.conLai, 0),
  }
}

async function getInventoryValue() {
  const products = await prisma.product.findMany({ select: { tonKho: true, giaVon: true, phiVanChuyen: true } })
  return products.reduce((sum, p) => sum + p.tonKho * (p.giaVon + p.phiVanChuyen), 0)
}

/** Lợi nhuận lũy kế từ trước tới nay = tổng Thu - tổng Chi toàn bộ sổ quỹ (không lọc theo kỳ). */
async function getAllTimeNetIncome() {
  const [thu, chi] = await Promise.all([
    prisma.incomeExpense.aggregate({ where: { loai: "THU" }, _sum: { soTien: true } }),
    prisma.incomeExpense.aggregate({ where: { loai: "CHI" }, _sum: { soTien: true } }),
  ])
  return (thu._sum.soTien ?? 0) - (chi._sum.soTien ?? 0)
}

async function getGrossProfitForRange(tuNgay: Date, denNgay: Date) {
  const orders = await prisma.order.findMany({
    where: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } },
    include: { items: true },
  })
  return orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.thanhTien - i.soLuong * i.giaVon), 0), 0)
}

export async function getOverview() {
  const { tuNgay: thangTuNgay, denNgay: thangDenNgay } = resolveDateRange("thang_nay")

  const now = new Date()
  // 3 tháng độc lập với nhau — trước đây chạy tuần tự trong for-loop (mỗi vòng
  // chờ round-trip DB xong mới sang vòng sau); gộp cả 3 tháng + các số liệu
  // khác vào một Promise.all duy nhất để chỉ tốn 1 "vòng" độ trễ round-trip
  // (quan trọng khi DB ở xa như Neon, mỗi round-trip ~150-300ms).
  const months = Array.from({ length: 3 }, (_, idx) => {
    const i = 2 - idx
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
    return { label: `T${monthStart.getMonth() + 1}`, monthStart, monthEnd }
  })

  const [balance, debtTotals, giaTriTonKho, loiNhuanThang, monthlyAggregates] = await Promise.all([
    getOrCreateBalance(),
    getDebtTotals(),
    getInventoryValue(),
    getGrossProfitForRange(thangTuNgay, thangDenNgay),
    Promise.all(
      months.map(({ monthStart, monthEnd }) =>
        Promise.all([
          prisma.incomeExpense.aggregate({ where: { loai: "THU", createdAt: { gte: monthStart, lte: monthEnd } }, _sum: { soTien: true } }),
          prisma.incomeExpense.aggregate({ where: { loai: "CHI", createdAt: { gte: monthStart, lte: monthEnd } }, _sum: { soTien: true } }),
        ]),
      ),
    ),
  ])

  const tinhHinhTaiChinh = months.map(({ label }, idx) => {
    const [thu, chi] = monthlyAggregates[idx]
    const thuVal = thu._sum.soTien ?? 0
    const chiVal = chi._sum.soTien ?? 0
    return { thang: label, thu: thuVal, chi: chiVal, loiNhuan: thuVal - chiVal }
  })

  return {
    tienMat: balance.tienMat,
    tienNganHang: balance.tienNganHang,
    congNoPhaiThu: debtTotals.congNoPhaiThu,
    congNoPhaiTra: debtTotals.congNoPhaiTra,
    giaTriTonKho,
    loiNhuanThang,
    tinhHinhTaiChinh,
  }
}

export function getBalance() {
  return getOrCreateBalance()
}

export async function updateBalance(data: Partial<{
  tienMat: number
  tienNganHang: number
  vonChuSoHuu: number
  taiSanKhac: number
  chiPhiChuaThanhToan: number
  khoanPhaiTraKhac: number
}>) {
  await getOrCreateBalance()
  return prisma.accountingBalance.update({ where: { id: "singleton" }, data })
}

export async function getBalanceSheet() {
  const [balance, debtTotals, giaTriTonKho, loiNhuanGiuLai] = await Promise.all([
    getOrCreateBalance(),
    getDebtTotals(),
    getInventoryValue(),
    getAllTimeNetIncome(),
  ])

  const taiSanNganHan = {
    tienMat: balance.tienMat,
    tienGuiNganHang: balance.tienNganHang,
    congNoPhaiThu: debtTotals.congNoPhaiThu,
    hangTonKho: giaTriTonKho,
    taiSanKhac: balance.taiSanKhac,
  }
  const tongTaiSan = Object.values(taiSanNganHan).reduce((a, b) => a + b, 0)

  const noPhaiTra = {
    congNoNhaCungCap: debtTotals.congNoPhaiTra,
    chiPhiChuaThanhToan: balance.chiPhiChuaThanhToan,
    khoanPhaiTraKhac: balance.khoanPhaiTraKhac,
  }
  const tongNoPhaiTra = Object.values(noPhaiTra).reduce((a, b) => a + b, 0)

  // Lợi nhuận giữ lại = lợi nhuận lũy kế thật từ sổ Thu/Chi (getAllTimeNetIncome),
  // KHÔNG còn là số chêm cho khớp bảng như trước — nếu tienMat/tienNganHang/
  // taiSanKhac (nhập tay ở Cân đối kế toán) không khớp thực tế, canDoi sẽ ra
  // false và lệch đúng bằng phần nhập tay sai, giúp phát hiện sai sót thật.
  const vonChuSoHuuGroup = { vonChuSoHuu: balance.vonChuSoHuu, loiNhuanGiuLai }
  const tongVonChuSoHuu = balance.vonChuSoHuu + loiNhuanGiuLai
  const tongNguonVon = tongNoPhaiTra + tongVonChuSoHuu
  const chenhLech = tongTaiSan - tongNguonVon

  return {
    thoiDiem: new Date(),
    taiSan: { taiSanNganHan, tongTaiSan },
    nguonVon: { noPhaiTra, vonChuSoHuu: vonChuSoHuuGroup, tongNoPhaiTra, tongVonChuSoHuu, tongNguonVon },
    canDoi: chenhLech === 0,
    chenhLech,
  }
}
