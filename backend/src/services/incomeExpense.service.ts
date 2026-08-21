import type { IncomeExpenseCategory, Prisma, TransactionKind } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { resolveDateRange, type RangeKey } from "../lib/dateRange.js"
import { notFound } from "../errors/HttpError.js"

const MA_PREFIX = { THU: "PT", CHI: "PC" } as const

interface FilterParams {
  loai?: TransactionKind
  danhMuc?: IncomeExpenseCategory
  nguoiTaoId?: string
  range?: RangeKey
  tuNgay?: Date
  denNgay?: Date
}

interface ListParams extends FilterParams {
  page: number
  pageSize: number
}

function buildWhere(params: FilterParams): Prisma.IncomeExpenseWhereInput {
  const dateRange = params.range ? resolveDateRange(params.range, params.tuNgay, params.denNgay) : null
  return {
    ...(params.loai ? { loai: params.loai } : {}),
    ...(params.danhMuc ? { danhMuc: params.danhMuc } : {}),
    ...(params.nguoiTaoId ? { nguoiTaoId: params.nguoiTaoId } : {}),
    ...(dateRange ? { createdAt: { gte: dateRange.tuNgay, lte: dateRange.denNgay } } : {}),
  }
}

export async function list(params: ListParams) {
  const where = buildWhere(params)

  const [items, total] = await Promise.all([
    prisma.incomeExpense.findMany({
      where,
      include: { nguoiTao: { select: { id: true, hoTen: true } } },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.incomeExpense.count({ where }),
  ])

  return { items, total, page: params.page, pageSize: params.pageSize }
}

export async function getSummary(params: FilterParams) {
  const where = buildWhere(params)

  const [thu, chi] = await Promise.all([
    prisma.incomeExpense.aggregate({ where: { ...where, loai: "THU" }, _sum: { soTien: true } }),
    prisma.incomeExpense.aggregate({ where: { ...where, loai: "CHI" }, _sum: { soTien: true } }),
  ])

  const tongThu = thu._sum.soTien ?? 0
  const tongChi = chi._sum.soTien ?? 0
  return { tongThu, tongChi, dongTienRong: tongThu - tongChi }
}

export async function create(params: { loai: TransactionKind; danhMuc: IncomeExpenseCategory; noiDung: string; soTien: number; nguoiTaoId: string }) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.incomeExpense.create({
      data: {
        maPhieu: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        loai: params.loai,
        danhMuc: params.danhMuc,
        noiDung: params.noiDung,
        soTien: params.soTien,
        nguoiTaoId: params.nguoiTaoId,
      },
    })
    return tx.incomeExpense.update({
      where: { id: created.id },
      data: { maPhieu: `${MA_PREFIX[params.loai]}-${String(created.soThuTu).padStart(5, "0")}` },
      include: { nguoiTao: { select: { id: true, hoTen: true } } },
    })
  })
}

export function update(id: string, data: Partial<{ danhMuc: IncomeExpenseCategory; noiDung: string; soTien: number }>) {
  return prisma.incomeExpense.update({ where: { id }, data, include: { nguoiTao: { select: { id: true, hoTen: true } } } })
}

export async function remove(id: string) {
  const current = await prisma.incomeExpense.findUnique({ where: { id } })
  if (!current) throw notFound("Không tìm thấy phiếu thu/chi.")
  await prisma.incomeExpense.delete({ where: { id } })
}
