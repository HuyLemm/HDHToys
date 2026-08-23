import type { LoaiSanPham, Prisma, ProductStatus } from "@prisma/client"
import { fileTypeFromBuffer } from "file-type"
import { prisma } from "../lib/prisma.js"
import { resolveStockStatus } from "../lib/productStatus.js"
import { badRequest, conflict, notFound } from "../errors/HttpError.js"

export async function list(params: {
  q?: string
  danhMuc?: string
  nhaCungCap?: string
  trangThai?: ProductStatus
  loaiSanPham?: LoaiSanPham
  page: number
  pageSize: number
}) {
  const { q, danhMuc, nhaCungCap, trangThai, loaiSanPham, page, pageSize } = params

  const where: Prisma.ProductWhereInput = {
    ...(danhMuc ? { danhMuc } : {}),
    ...(nhaCungCap ? { nhaCungCap } : {}),
    ...(trangThai ? { trangThai } : {}),
    ...(loaiSanPham ? { loaiSanPham } : {}),
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

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function get(id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw notFound("Không tìm thấy sản phẩm.")
  return product
}

/**
 * Sản phẩm "có sẵn" thì không giữ ngày dự kiến về/nhắc hàng của lần chọn
 * pre-order trước đó. Ngược lại, Pre-order bắt buộc phải có ngày dự kiến —
 * không thì tính năng nhắc hàng về (banner ở Dashboard/chi tiết SP) vô nghĩa.
 */
function resolveProductType(loaiSanPham: LoaiSanPham, ngayDuKienVe?: Date | null, nhacHang?: boolean) {
  if (loaiSanPham === "CO_SAN") return { loaiSanPham, ngayDuKienVe: null, nhacHang: false }
  if (!ngayDuKienVe) throw badRequest("Sản phẩm Pre-order cần nhập ngày dự kiến hàng về.")
  return { loaiSanPham, ngayDuKienVe, nhacHang: nhacHang ?? false }
}

export async function create(data: {
  sku: string
  ten: string
  barcode?: string
  danhMuc: string
  nhaCungCap: string
  anhUrl?: string
  giaVon: number
  phiVanChuyen: number
  giaBan: number
  tonKho: number
  tonKhoToiThieu: number
  loaiSanPham?: LoaiSanPham
  ngayDuKienVe?: Date
  nhacHang?: boolean
}) {
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } })
  if (existing) throw conflict("SKU đã tồn tại.")

  const { loaiSanPham, ngayDuKienVe, nhacHang, ...rest } = data
  return prisma.product.create({
    data: {
      ...rest,
      ...resolveProductType(loaiSanPham ?? "CO_SAN", ngayDuKienVe, nhacHang),
      trangThai: resolveStockStatus(data.tonKho, data.tonKhoToiThieu, "CON_HANG"),
    },
  })
}

export async function update(
  id: string,
  data: Partial<{
    ten: string
    barcode: string
    danhMuc: string
    nhaCungCap: string
    anhUrl: string
    giaVon: number
    phiVanChuyen: number
    giaBan: number
    tonKhoToiThieu: number
    loaiSanPham: LoaiSanPham
    ngayDuKienVe: Date
    nhacHang: boolean
  }>,
) {
  const current = await get(id)
  const tonKhoToiThieu = data.tonKhoToiThieu ?? current.tonKhoToiThieu
  const { loaiSanPham, ngayDuKienVe, nhacHang, ...rest } = data

  return prisma.product.update({
    where: { id },
    data: {
      ...rest,
      ...(loaiSanPham !== undefined || ngayDuKienVe !== undefined || nhacHang !== undefined
        ? resolveProductType(
            loaiSanPham ?? current.loaiSanPham,
            ngayDuKienVe ?? current.ngayDuKienVe,
            nhacHang ?? current.nhacHang,
          )
        : {}),
      trangThai: resolveStockStatus(current.tonKho, tonKhoToiThieu, current.trangThai),
    },
  })
}

export function discontinue(id: string) {
  return prisma.product.update({ where: { id }, data: { trangThai: "NGUNG_KINH_DOANH" as ProductStatus } })
}

export async function reactivate(id: string) {
  const current = await get(id)
  return prisma.product.update({
    where: { id },
    data: { trangThai: resolveStockStatus(current.tonKho, current.tonKhoToiThieu, "CON_HANG") },
  })
}

/**
 * Chỉ chặn nếu còn Đơn hàng hoặc Đặt trước thật sự đang tham chiếu sản phẩm
 * (orderItemCount/preorderCount) — đây là dữ liệu giao dịch cần giữ lại nếu
 * còn tồn tại. Lịch sử kho (InventoryTransaction) KHÔNG chặn xóa nữa: nếu
 * đơn hàng liên quan đã bị xóa thì lịch sử kho của riêng sản phẩm này không
 * còn ý nghĩa gì để giữ lại — xóa sản phẩm sẽ tự động xóa theo (onDelete:
 * Cascade trong schema). Muốn giữ lại lịch sử thì dùng "Ngừng kinh doanh".
 */
export async function remove(id: string) {
  await get(id)

  const [orderItemCount, preorderCount] = await Promise.all([
    prisma.orderItem.count({ where: { productId: id } }),
    prisma.preorder.count({ where: { productId: id } }),
  ])

  if (orderItemCount > 0 || preorderCount > 0) {
    throw badRequest(
      "Không thể xóa sản phẩm đã có trong đơn hàng hoặc đơn đặt trước còn tồn tại — hãy dùng 'Ngừng kinh doanh' thay thế.",
    )
  }

  await prisma.product.delete({ where: { id } })
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function getImage(productId: string) {
  const image = await prisma.productImage.findUnique({ where: { productId } })
  if (!image) throw notFound("Sản phẩm này chưa có ảnh.")
  return image
}

/** Tham số mimeType không còn dùng để lưu — giữ lại chữ ký để controller không đổi, nhưng KHÔNG tin giá trị client khai; xem bên trong. */
export async function uploadImage(productId: string, data: Buffer, _declaredMimeType: string) {
  await get(productId)

  if (data.length > MAX_IMAGE_BYTES) {
    throw badRequest("Ảnh vượt quá 3MB, vui lòng chọn ảnh nhỏ hơn.")
  }

  // Dò trực tiếp magic bytes của nội dung file thật, để chặn file giả dạng
  // ảnh (ví dụ đổi tên .html/.svg rồi khai Content-Type: image/png trong
  // header multipart). Dùng luôn mimeType đã dò được để lưu/serve lại.
  const detected = await fileTypeFromBuffer(data)
  if (!detected || !ALLOWED_IMAGE_MIME_TYPES.includes(detected.mime)) {
    throw badRequest("Chỉ hỗ trợ ảnh JPEG, PNG, WEBP hoặc GIF (nội dung file không khớp định dạng ảnh hợp lệ).")
  }
  const mimeType = detected.mime

  // Buffer (Node) là Uint8Array<ArrayBufferLike> — Prisma's Bytes field kiểu
  // Uint8Array<ArrayBuffer> chặt hơn (loại trừ SharedArrayBuffer). Copy sang
  // Uint8Array thường để khớp kiểu, không ảnh hưởng nội dung dữ liệu.
  const bytes = new Uint8Array(data)
  await prisma.productImage.upsert({
    where: { productId },
    create: { productId, data: bytes, mimeType },
    update: { data: bytes, mimeType },
  })
}

export async function deleteImage(productId: string) {
  await prisma.productImage.deleteMany({ where: { productId } })
}
