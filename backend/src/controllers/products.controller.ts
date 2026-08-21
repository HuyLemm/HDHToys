import type { NextFunction, Request, Response } from "express"
import { z } from "zod"
import multer from "multer"
import { badRequest } from "../errors/HttpError.js"
import * as productsService from "../services/products.service.js"

// memoryStorage giữ file trong RAM (Buffer) — không viết ra ổ đĩa, vì server
// Render free tier có filesystem tạm, mất dữ liệu mỗi lần redeploy/restart.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } })

/** Bọc middleware multer để lỗi (sai định dạng/quá dung lượng) trả 400 tiếng Việt thay vì 500 chung. */
export function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("image")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") return next(badRequest("Ảnh vượt quá 3MB, vui lòng chọn ảnh nhỏ hơn."))
      return next(badRequest("Không thể tải ảnh lên."))
    }
    if (err) return next(err)
    next()
  })
}

const listQuerySchema = z.object({
  q: z.string().optional(),
  danhMuc: z.string().optional(),
  nhaCungCap: z.string().optional(),
  trangThai: z.enum(["CON_HANG", "SAP_HET", "HET_HANG", "NGUNG_KINH_DOANH"]).optional(),
  loaiSanPham: z.enum(["CO_SAN", "PRE_ORDER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await productsService.list(parsed.data))
}

export async function get(req: Request, res: Response) {
  res.json(await productsService.get(req.params.id))
}

const createSchema = z.object({
  sku: z.string().min(1),
  ten: z.string().min(1),
  barcode: z.string().optional(),
  danhMuc: z.string().min(1),
  nhaCungCap: z.string().min(1),
  anhUrl: z.string().url().optional(),
  giaVon: z.number().int().min(1, "Giá vốn phải lớn hơn 0."),
  phiVanChuyen: z.number().int().min(0).default(0),
  giaBan: z.number().int().min(1, "Giá bán phải lớn hơn 0."),
  tonKho: z.number().int().min(0).default(0),
  tonKhoToiThieu: z.number().int().min(0).default(0),
  loaiSanPham: z.enum(["CO_SAN", "PRE_ORDER"]).default("CO_SAN"),
  ngayDuKienVe: z.coerce.date().optional(),
  nhacHang: z.boolean().default(false),
})

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.status(201).json(await productsService.create(parsed.data))
}

const updateSchema = z.object({
  ten: z.string().min(1).optional(),
  barcode: z.string().optional(),
  danhMuc: z.string().min(1).optional(),
  nhaCungCap: z.string().min(1).optional(),
  anhUrl: z.string().url().optional(),
  giaVon: z.number().int().min(1, "Giá vốn phải lớn hơn 0.").optional(),
  phiVanChuyen: z.number().int().min(0).optional(),
  giaBan: z.number().int().min(1, "Giá bán phải lớn hơn 0.").optional(),
  tonKhoToiThieu: z.number().int().min(0).optional(),
  loaiSanPham: z.enum(["CO_SAN", "PRE_ORDER"]).optional(),
  ngayDuKienVe: z.coerce.date().optional(),
  nhacHang: z.boolean().optional(),
})

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.json(await productsService.update(req.params.id, parsed.data))
}

export async function discontinue(req: Request, res: Response) {
  res.json(await productsService.discontinue(req.params.id))
}

export async function reactivate(req: Request, res: Response) {
  res.json(await productsService.reactivate(req.params.id))
}

export async function remove(req: Request, res: Response) {
  await productsService.remove(req.params.id)
  res.status(204).send()
}

export async function getImage(req: Request, res: Response) {
  const image = await productsService.getImage(req.params.id)
  res.setHeader("Content-Type", image.mimeType)
  res.setHeader("Cache-Control", "private, max-age=300")
  // Prisma trả cột Bytes dạng Uint8Array thường (không phải Node Buffer) —
  // res.send() trên Uint8Array không phải Buffer sẽ tưởng là object JSON
  // thường và serialize từng byte thành {"0":.., "1":..}. Bọc Buffer.from()
  // để Express nhận diện đúng và gửi nhị phân thật.
  res.send(Buffer.from(image.data))
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) throw badRequest("Vui lòng chọn một ảnh để tải lên.")
  await productsService.uploadImage(req.params.id, req.file.buffer, req.file.mimetype)
  res.status(201).json({ ok: true })
}

export async function deleteImage(req: Request, res: Response) {
  await productsService.deleteImage(req.params.id)
  res.status(204).send()
}
