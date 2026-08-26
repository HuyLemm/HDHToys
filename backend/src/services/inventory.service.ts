import type { InventoryTransactionType, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { resolveStockStatus } from "../lib/productStatus.js"
import { badRequest, conflict, notFound } from "../errors/HttpError.js"

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
    /** Cộng/trừ so với tồn kho hiện tại. Bỏ qua nếu có tonKhoTuyetDoi. */
    soLuongThayDoi?: number
    /**
     * Đặt tồn kho về ĐÚNG giá trị này thay vì cộng/trừ một lượng cố định —
     * dùng cho kiểm kho (inventory.service.ts#adjust). Độ lệch thật sự áp
     * dụng luôn được tính từ tonKho vừa đọc NGAY TRONG transaction này, tránh
     * việc gọi hàm tính sẵn một độ lệch từ số liệu đọc TRƯỚC khi mở
     * transaction rồi áp lên một tonKho có thể đã đổi khác do một giao dịch
     * kho khác chen vào giữa hai thời điểm đó (kết quả kiểm kho sẽ sai mà
     * không có lỗi/cảnh báo gì, vì compare-and-swap bên dưới chỉ đảm bảo ghi
     * đúng tonKho vừa đọc, không biết độ lệch truyền vào đã lỗi thời).
     */
    tonKhoTuyetDoi?: number
    nguoiThucHienId: string
    thamChieu?: string
    ghiChu?: string
    /** Chỉ dùng cho import dữ liệu lịch sử (backdating) — bỏ trống thì dùng đúng thời điểm ghi (mặc định Prisma). */
    createdAt?: Date
  },
) {
  const product = await tx.product.findUnique({ where: { id: params.productId } })
  if (!product) throw notFound("Không tìm thấy sản phẩm.")

  const tonSau = params.tonKhoTuyetDoi !== undefined ? params.tonKhoTuyetDoi : product.tonKho + (params.soLuongThayDoi ?? 0)
  const soLuongThayDoi = tonSau - product.tonKho
  if (tonSau < 0) {
    throw badRequest(
      `Tồn kho không đủ cho sản phẩm ${product.ten} (hiện có ${product.tonKho}, cần ${-soLuongThayDoi}).`,
    )
  }

  // Cập nhật kiểu "so sánh rồi mới ghi" (optimistic concurrency): điều kiện
  // `tonKho: product.tonKho` trong where nghĩa là chỉ ghi nếu không ai khác
  // đã đổi tonKho của CHÍNH sản phẩm này kể từ lúc ta đọc ở trên — nếu 2 giao
  // dịch kho cho cùng 1 sản phẩm chạy gần như đồng thời, giao dịch thứ 2 sẽ
  // ảnh hưởng 0 dòng thay vì âm thầm ghi đè lên số liệu đã lỗi thời (race
  // condition từng ghi nhận ở SRS 6.13/SDS 5.12 điểm 6). Đã thử
  // `SELECT ... FOR UPDATE` trước đó nhưng gây treo transaction khi chạy qua
  // connection pooler transaction-mode của Neon (PgBouncer) — cách so-sánh-
  // rồi-ghi này chỉ dùng UPDATE...WHERE thường, không cần giữ lock phiên nên
  // an toàn với mọi loại pooler.
  const updateResult = await tx.product.updateMany({
    where: { id: params.productId, tonKho: product.tonKho },
    data: { tonKho: tonSau, trangThai: resolveStockStatus(tonSau, product.tonKhoToiThieu, product.trangThai) },
  })
  if (updateResult.count === 0) {
    throw conflict(`Tồn kho sản phẩm ${product.ten} vừa được một thao tác khác thay đổi, vui lòng thử lại.`)
  }

  const created = await tx.inventoryTransaction.create({
    data: {
      maGiaoDich: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: params.productId,
      loai: params.loai,
      soLuongThayDoi,
      tonTruoc: product.tonKho,
      tonSau,
      nguoiThucHienId: params.nguoiThucHienId,
      thamChieu: params.thamChieu,
      ghiChu: params.ghiChu,
      ...(params.createdAt ? { createdAt: params.createdAt } : {}),
    },
  })

  const transaction = await tx.inventoryTransaction.update({
    where: { id: created.id },
    data: { maGiaoDich: `${MA_PREFIX[params.loai]}-${String(created.soThuTu).padStart(5, "0")}` },
    include: { product: { select: { id: true, sku: true, ten: true } }, nguoiThucHien: { select: { id: true, hoTen: true } } },
  })

  return transaction
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
  return prisma.$transaction(async (tx) => {
    const transaction = await applyInventoryTransaction(tx, {
      productId: params.productId,
      loai: "XUAT",
      soLuongThayDoi: -params.soLuong,
      nguoiThucHienId: params.nguoiThucHienId,
      thamChieu: params.thamChieu,
      ghiChu: params.ghiChu,
    })

    // Sản phẩm Pre-order thường được giao thẳng cho khách ngay khi Xuất kho
    // thủ công ở đây (không tạo Đơn hàng riêng cho lần giao đó) — khác với
    // sản phẩm Có sẵn, vốn đã tự cộng "đã bán" khi Đơn hàng chuyển Hoàn
    // thành (xem orders.service.ts#applyOrderCompletion). Không áp dụng cho
    // Có sẵn vì Xuất kho thủ công của loại đó thường là hư hỏng/thất thoát,
    // không phải một lượt bán.
    const product = await tx.product.findUnique({ where: { id: params.productId }, select: { loaiSanPham: true } })
    if (product?.loaiSanPham === "PRE_ORDER") {
      await tx.product.update({ where: { id: params.productId }, data: { daBan: { increment: params.soLuong } } })
    }

    return transaction
  })
}

export async function adjust(params: { productId: string; tonKhoMoi: number; ghiChu?: string; nguoiThucHienId: string }) {
  return prisma.$transaction((tx) =>
    applyInventoryTransaction(tx, {
      productId: params.productId,
      loai: "DIEU_CHINH",
      tonKhoTuyetDoi: params.tonKhoMoi,
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

  return prisma.$transaction(async (tx) => {
    // Kiểm tra lại "là giao dịch gần nhất" NGAY TRONG transaction (không chỉ
    // ở ngoài trước khi mở transaction) — tránh một giao dịch kho khác chen
    // vào đúng lúc giữa hai thời điểm đó (TOCTOU), khiến điều kiện đã kiểm ở
    // ngoài không còn đúng nữa lúc thật sự xóa/ghi tonKho bên dưới.
    const latest = await tx.inventoryTransaction.findFirst({
      where: { productId: transaction.productId },
      orderBy: { soThuTu: "desc" },
    })
    if (latest?.id !== id) {
      throw badRequest(
        "Chỉ xóa được giao dịch kho gần nhất của sản phẩm này — xóa một giao dịch ở giữa lịch sử sẽ làm sai lệch số liệu tồn kho các giao dịch sau đó.",
      )
    }

    const product = await tx.product.findUnique({ where: { id: transaction.productId } })
    if (!product) throw notFound("Không tìm thấy sản phẩm.")

    const tonKhoSauKhiHoanTac = product.tonKho - transaction.soLuongThayDoi
    const updateResult = await tx.product.updateMany({
      where: { id: transaction.productId, tonKho: product.tonKho },
      data: {
        tonKho: tonKhoSauKhiHoanTac,
        trangThai: resolveStockStatus(tonKhoSauKhiHoanTac, product.tonKhoToiThieu, product.trangThai),
        // Nếu giao dịch bị hoàn là một lượt Xuất kho cho SP Pre-order,
        // stockOut() đã cộng daBan lúc tạo (giao hàng trực tiếp, không qua
        // Order) — hoàn tác giao dịch đó cũng phải trừ lại daBan, không thì
        // "đã bán" bị kẹt cao hơn thực tế mãi mãi sau khi undo.
        ...(transaction.loai === "XUAT" && product.loaiSanPham === "PRE_ORDER"
          ? { daBan: { decrement: -transaction.soLuongThayDoi } }
          : {}),
      },
    })
    if (updateResult.count === 0) {
      throw conflict("Tồn kho sản phẩm vừa được một thao tác khác thay đổi, vui lòng thử lại.")
    }
    await tx.inventoryTransaction.delete({ where: { id } })
  })
}

export async function getHistory(params: {
  q?: string
  productId?: string
  loai?: InventoryTransactionType
  nguoiThucHienId?: string
  tuNgay?: Date
  denNgay?: Date
  page: number
  pageSize: number
}) {
  const { q, productId, loai, nguoiThucHienId, tuNgay, denNgay, page, pageSize } = params

  const where: Prisma.InventoryTransactionWhereInput = {
    ...(productId ? { productId } : {}),
    ...(loai ? { loai } : {}),
    ...(nguoiThucHienId ? { nguoiThucHienId } : {}),
    ...(tuNgay || denNgay
      ? { createdAt: { ...(tuNgay ? { gte: tuNgay } : {}), ...(denNgay ? { lte: denNgay } : {}) } }
      : {}),
    // Lọc theo tên/SKU sản phẩm ngay ở tầng SQL (sửa 2026-08-25) — trước đây
    // frontend tự lọc trên dữ liệu của TRANG hiện tại sau khi đã phân trang,
    // nên bỏ lọt kết quả nằm ở trang khác.
    ...(q
      ? { product: { OR: [{ ten: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } }
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
