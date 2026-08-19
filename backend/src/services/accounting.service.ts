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
  const products = await prisma.product.findMany({ select: { tonKho: true, giaVon: true } })
  return products.reduce((sum, p) => sum + p.tonKho * p.giaVon, 0)
}

async function getGrossProfitForRange(tuNgay: Date, denNgay: Date) {
  const orders = await prisma.order.findMany({
    where: { trangThai: "HOAN_THANH", createdAt: { gte: tuNgay, lte: denNgay } },
    include: { items: true },
  })
  return orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.thanhTien - i.soLuong * i.giaVon), 0), 0)
}

export async function getOverview() {
  const [balance, debtTotals, giaTriTonKho] = await Promise.all([getOrCreateBalance(), getDebtTotals(), getInventoryValue()])

  const { tuNgay: thangTuNgay, denNgay: thangDenNgay } = resolveDateRange("thang_nay")
  const loiNhuanThang = await getGrossProfitForRange(thangTuNgay, thangDenNgay)

  const now = new Date()
  const tinhHinhTaiChinh: { thang: string; thu: number; chi: number; loiNhuan: number }[] = []
  for (let i = 2; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
    const [thu, chi] = await Promise.all([
      prisma.incomeExpense.aggregate({ where: { loai: "THU", createdAt: { gte: monthStart, lte: monthEnd } }, _sum: { soTien: true } }),
      prisma.incomeExpense.aggregate({ where: { loai: "CHI", createdAt: { gte: monthStart, lte: monthEnd } }, _sum: { soTien: true } }),
    ])
    const thuVal = thu._sum.soTien ?? 0
    const chiVal = chi._sum.soTien ?? 0
    tinhHinhTaiChinh.push({ thang: `T${monthStart.getMonth() + 1}`, thu: thuVal, chi: chiVal, loiNhuan: thuVal - chiVal })
  }

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
  const [balance, debtTotals, giaTriTonKho] = await Promise.all([getOrCreateBalance(), getDebtTotals(), getInventoryValue()])

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

  // Lợi nhuận giữ lại là số dư cân đối để đảm bảo Tổng tài sản = Nợ phải trả + Vốn chủ sở hữu,
  // do hệ thống chưa có sổ cái đầy đủ để tính lợi nhuận lũy kế một cách độc lập.
  const loiNhuanGiuLai = tongTaiSan - tongNoPhaiTra - balance.vonChuSoHuu
  const vonChuSoHuuGroup = { vonChuSoHuu: balance.vonChuSoHuu, loiNhuanGiuLai }
  const tongVonChuSoHuu = balance.vonChuSoHuu + loiNhuanGiuLai
  const tongNguonVon = tongNoPhaiTra + tongVonChuSoHuu

  return {
    thoiDiem: new Date(),
    taiSan: { taiSanNganHan, tongTaiSan },
    nguonVon: { noPhaiTra, vonChuSoHuu: vonChuSoHuuGroup, tongNoPhaiTra, tongVonChuSoHuu, tongNguonVon },
    canDoi: tongTaiSan === tongNguonVon,
  }
}
