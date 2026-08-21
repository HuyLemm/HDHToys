import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as preordersService from "../services/preorders.service.js"

const listQuerySchema = z.object({
  q: z.string().optional(),
  trangThai: z.enum(["CHO_HANG", "SAN_SANG", "DA_CHUYEN_DON", "DA_HUY"]).optional(),
  khachHangId: z.string().optional(),
  productId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await preordersService.list(parsed.data))
}

export async function summary(_req: Request, res: Response) {
  res.json(await preordersService.getSummary())
}

export async function get(req: Request, res: Response) {
  res.json(await preordersService.get(req.params.id))
}

const createSchema = z
  .object({
    khachHangId: z.string().min(1),
    nhanVienId: z.string().optional(),
    productId: z.string().optional(),
    tenSanPhamMoi: z.string().optional(),
    soLuong: z.number().int().min(1),
    donGiaDuKien: z.number().int().min(0),
    tienCoc: z.number().int().min(0).default(0),
    ngayDuKienCo: z.coerce.date().optional(),
    ghiChu: z.string().optional(),
  })
  .refine((v) => Boolean(v.productId) !== Boolean(v.tenSanPhamMoi), {
    message: "Cần chọn đúng một trong hai: sản phẩm có sẵn (productId) hoặc tên sản phẩm mới (tenSanPhamMoi).",
  })

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")

  const preorder = await preordersService.create({ ...parsed.data, fallbackNhanVienId: req.auth!.sub })
  res.status(201).json(preorder)
}

const updateSchema = z.object({
  soLuong: z.number().int().min(1).optional(),
  donGiaDuKien: z.number().int().min(0).optional(),
  tienCoc: z.number().int().min(0).optional(),
  ngayDuKienCo: z.coerce.date().optional(),
  ghiChu: z.string().optional(),
})

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Dữ liệu không hợp lệ.")
  res.json(await preordersService.update(req.params.id, parsed.data))
}

export async function cancel(req: Request, res: Response) {
  res.json(await preordersService.cancel(req.params.id))
}

export async function remove(req: Request, res: Response) {
  await preordersService.remove(req.params.id)
  res.status(204).send()
}

const convertSchema = z.object({
  productId: z.string().optional(),
  phuongThucThanhToan: z.enum(["TIEN_MAT", "CHUYEN_KHOAN", "THE", "QR_CODE"]),
  kenhBan: z.enum(["TAI_CUA_HANG", "DIEN_THOAI", "FACEBOOK", "ZALO", "TIKTOK", "KHAC"]).optional(),
  vat: z.number().int().min(0).optional(),
})

export async function convertToOrder(req: Request, res: Response) {
  const parsed = convertSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Dữ liệu không hợp lệ.")

  const result = await preordersService.convertToOrder({
    id: req.params.id,
    ...parsed.data,
    nguoiThucHienId: req.auth!.sub,
  })
  res.json(result)
}
