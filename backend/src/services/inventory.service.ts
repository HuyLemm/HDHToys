import type { InventoryTransactionType, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { resolveStockStatus } from "../lib/productStatus.js"
import { badRequest, notFound } from "../errors/HttpError.js"

const MA_PREFIX: Record<InventoryTransactionType, string> = {
  NHAP: "NK",
  XUAT: "XK",
  DIEU_CHINH: "DC",
  TRA_HANG: "TH",
}

/**
 * Applies one stock movement (nhập/xuất/điều chỉnh/trả hàng) inside a Prisma
 * transaction: writes the audit-trail InventoryTransaction row and updates
 * the product's tonKho + trangThai to match. Shared by inventory.service and
 * orders.service (order completion/refund also moves stock).
 */
export async function applyInventoryTransaction(
  tx: Prisma.TransactionClient,
  params: {
    productId: string
    loai: InventoryTransactionType
    soLuongThayDoi: number
    nguoiThucHienId: string
    thamChieu?: string
    ghiChu?: string
  },
) {
  const product = await tx.product.findUnique({ where: { id: params.productId } })
  if (!product) throw notFound("Không tìm thấy sản phẩm.")

  const tonSau = product.tonKho + params.soLuongThayDoi
  if (tonSau < 0) {
    throw badRequest(
      `Tồn kho không đủ cho sản phẩm ${product.ten} (hiện có ${product.tonKho}, cần ${-params.soLuongThayDoi}).`,
    )
  }

  const created = await tx.inventoryTransaction.create({
    data: {
      maGiaoDich: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: params.productId,
      loai: params.loai,
      soLuongThayDoi: params.soLuongThayDoi,
      tonTruoc: product.tonKho,
      tonSau,
      nguoiThucHienId: params.nguoiThucHienId,
      thamChieu: params.thamChieu,
      ghiChu: params.ghiChu,
    },
  })

  const transaction = await tx.inventoryTransaction.update({
    where: { id: created.id },
    data: { maGiaoDich: `${MA_PREFIX[params.loai]}-${String(created.soThuTu).padStart(5, "0")}` },
    include: { product: { select: { id: true, sku: true, ten: true } }, nguoiThucHien: { select: { id: true, hoTen: true } } },
  })

  await tx.product.update({
    where: { id: params.productId },
    data: {
      tonKho: tonSau,
      trangThai: resolveStockStatus(tonSau, product.tonKhoToiThieu, product.trangThai),
    },
  })

  // Tồn kho vừa tăng (nhập/điều chỉnh tăng/trả hàng) — kiểm tra xem đã đủ hàng
  // cho các đơn đặt trước (Preorder) đang chờ chưa, khớp theo thứ tự đặt
  // trước (FIFO). Chỉ đánh dấu "sẵn sàng giao" để nhân viên xác nhận thủ
  // công — KHÔNG giữ/trừ tồn kho hộ (hệ thống chưa có khái niệm giữ hàng),
  // nên đây là gợi ý, không phải một chỗ đảm bảo chắc chắn còn hàng.
  if (params.soLuongThayDoi > 0) {
    await matchPendingPreorders(tx, params.productId, tonSau)
  }

  return transaction
}

async function matchPendingPreorders(tx: Prisma.TransactionClient, productId: string, tonKhoHienTai: number) {
  const pending = await tx.preorder.findMany({
    where: { productId, trangThai: "CHO_HANG" },
    orderBy: { createdAt: "asc" },
    select: { id: true, soLuong: true },
  })

  let remaining = tonKhoHienTai
  const readyIds: string[] = []
  for (const p of pending) {
    if (remaining < p.soLuong) break // hết hàng khả dụng — không vượt qua đơn đang chờ để tôn trọng thứ tự FIFO
    remaining -= p.soLuong
    readyIds.push(p.id)
  }

  if (readyIds.length > 0) {
    await tx.preorder.updateMany({ where: { id: { in: readyIds } }, data: { trangThai: "SAN_SANG" } })
  }
}

export async function getSummary() {
  const [aggregate, sapHet, hetHang, tongSku] = await Promise.all([
    prisma.product.aggregate({ _sum: { tonKho: true } }),
    prisma.product.count({ where: { trangThai: "SAP_HET" } }),
    prisma.product.count({ where: { trangThai: "HET_HANG" } }),
    prisma.product.count(),
  ])

  const products = await prisma.product.findMany({ select: { tonKho: true, giaVon: true, phiVanChuyen: true } })
  const giaTriTonKho = products.reduce((sum, p) => sum + p.tonKho * (p.giaVon + p.phiVanChuyen), 0)

  return {
    tongSku,
    tongSoLuongTon: aggregate._sum.tonKho ?? 0,
    giaTriTonKho,
    sanPhamSapHet: sapHet,
    sanPhamHetHang: hetHang,
  }
}

export async function list(params: {
  q?: string
  danhMuc?: string
  nhaCungCap?: string
  trangThai?: Prisma.ProductWhereInput["trangThai"]
  page: number
  pageSize: number
}) {
  const { q, danhMuc, nhaCungCap, trangThai, page, pageSize } = params

  const where: Prisma.ProductWhereInput = {
    ...(danhMuc ? { danhMuc } : {}),
    ...(nhaCungCap ? { nhaCungCap } : {}),
    ...(trangThai ? { trangThai } : {}),
    ...(q
      ? {
          OR: [
            { ten: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { ten: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  const items = products.map((p) => ({
    ...p,
    coTheBan: p.tonKho,
    giaTriTon: p.tonKho * (p.giaVon + p.phiVanChuyen),
  }))

  return { items, total, page, pageSize }
}

export function stockIn(params: { productId: string; soLuong: number; thamChieu?: string; ghiChu?: string; nguoiThucHienId: string }) {
  return prisma.$transaction((tx) =>
    applyInventoryTransaction(tx, {
      productId: params.productId,
      loai: "NHAP",
      soLuongThayDoi: params.soLuong,
      nguoiThucHienId: params.nguoiThucHienId,
      thamChieu: params.thamChieu,
      ghiChu: params.ghiChu,
    }),
  )
}

export function stockOut(params: { productId: string; soLuong: number; thamChieu?: string; ghiChu?: string; nguoiThucHienId: string }) {
  return prisma.$transaction((tx) =>
    applyInventoryTransaction(tx, {
      productId: params.productId,
      loai: "XUAT",
      soLuongThayDoi: -params.soLuong,
      nguoiThucHienId: params.nguoiThucHienId,
      thamChieu: params.thamChieu,
      ghiChu: params.ghiChu,
    }),
  )
}

export async function adjust(params: { productId: string; tonKhoMoi: number; ghiChu?: string; nguoiThucHienId: string }) {
  const product = await prisma.product.findUnique({ where: { id: params.productId } })
  if (!product) throw notFound("Không tìm thấy sản phẩm.")

  return prisma.$transaction((tx) =>
    applyInventoryTransaction(tx, {
      productId: params.productId,
      loai: "DIEU_CHINH",
      soLuongThayDoi: params.tonKhoMoi - product.tonKho,
      nguoiThucHienId: params.nguoiThucHienId,
      ghiChu: params.ghiChu ?? "Kiểm kho thực tế",
    }),
  )
}

/**
 * Chỉ Admin được gọi (route-level requireRole). InventoryTransaction là sổ
 * ghi kho — xóa một dòng ở giữa lịch sử sẽ làm sai lệch chuỗi tonTruoc/tonSau
 * của các dòng SAU nó (cho cùng sản phẩm), nên CHỈ cho xóa nếu đây là giao
 * dịch GẦN NHẤT của sản phẩm đó (không có giao dịch nào khác sau nó). Khi
 * xóa, hoàn tác đúng phần tồn kho đã ghi nhận để tonKho không bị lệch.
 */
export async function removeTransaction(id: string) {
  const transaction = await prisma.inventoryTransaction.findUnique({ where: { id } })
  if (!transaction) throw notFound("Không tìm thấy giao dịch kho.")

  const latest = await prisma.inventoryTransaction.findFirst({
    where: { productId: transaction.productId },
    orderBy: { soThuTu: "desc" },
  })
  if (latest?.id !== id) {
    throw badRequest(
      "Chỉ xóa được giao dịch kho gần nhất của sản phẩm này — xóa một giao dịch ở giữa lịch sử sẽ làm sai lệch số liệu tồn kho các giao dịch sau đó.",
    )
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: transaction.productId } })
    if (!product) throw notFound("Không tìm thấy sản phẩm.")

    const tonKhoSauKhiHoanTac = product.tonKho - transaction.soLuongThayDoi
    await tx.product.update({
      where: { id: transaction.productId },
      data: {
        tonKho: tonKhoSauKhiHoanTac,
        trangThai: resolveStockStatus(tonKhoSauKhiHoanTac, product.tonKhoToiThieu, product.trangThai),
      },
    })
    await tx.inventoryTransaction.delete({ where: { id } })
  })
}

export async function getHistory(params: {
  productId?: string
  loai?: InventoryTransactionType
  nguoiThucHienId?: string
  tuNgay?: Date
  denNgay?: Date
  page: number
  pageSize: number
}) {
  const { productId, loai, nguoiThucHienId, tuNgay, denNgay, page, pageSize } = params

  const where: Prisma.InventoryTransactionWhereInput = {
    ...(productId ? { productId } : {}),
    ...(loai ? { loai } : {}),
    ...(nguoiThucHienId ? { nguoiThucHienId } : {}),
    ...(tuNgay || denNgay
      ? { createdAt: { ...(tuNgay ? { gte: tuNgay } : {}), ...(denNgay ? { lte: denNgay } : {}) } }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, ten: true } },
        nguoiThucHien: { select: { id: true, hoTen: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryTransaction.count({ where }),
  ])

  return { items, total, page, pageSize }
}
