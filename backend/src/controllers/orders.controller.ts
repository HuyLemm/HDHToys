import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as ordersService from "../services/orders.service.js"

const listQuerySchema = z.object({
  q: z.string().optional(),
  trangThai: z.enum(["MOI", "DANG_XU_LY", "HOAN_THANH", "DA_HUY", "HOAN_TIEN"]).optional(),
  khachHangId: z.string().optional(),
  nhanVienId: z.string().optional(),
  phuongThucThanhToan: z.enum(["TIEN_MAT", "CHUYEN_KHOAN", "THE", "QR_CODE"]).optional(),
  tuNgay: z.coerce.date().optional(),
  denNgay: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await ordersService.list(parsed.data))
}

export async function get(req: Request, res: Response) {
  res.json(await ordersService.get(req.params.id))
}

const itemSchema = z.object({
  productId: z.string().min(1),
  soLuong: z.number().int().min(1),
  giaOverride: z.number().int().min(0).optional(),
  giamGia: z.number().int().min(0).default(0),
})

const createSchema = z.object({
  khachHangId: z.string().min(1),
  nhanVienId: z.string().optional(),
  kenhBan: z.enum(["TAI_CUA_HANG", "DIEN_THOAI", "FACEBOOK", "KHAC"]).default("TAI_CUA_HANG"),
  phuongThucThanhToan: z.enum(["TIEN_MAT", "CHUYEN_KHOAN", "THE", "QR_CODE"]),
  vat: z.number().int().min(0).default(0),
  ghiChu: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")

  const order = await ordersService.create({ ...parsed.data, fallbackNhanVienId: req.auth!.sub })
  res.status(201).json(order)
}

const statusSchema = z.object({
  trangThai: z.enum(["MOI", "DANG_XU_LY", "HOAN_THANH", "DA_HUY", "HOAN_TIEN"]),
})

export async function updateStatus(req: Request, res: Response) {
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Trạng thái không hợp lệ.")

  const order = await ordersService.updateStatus({
    orderId: req.params.id,
    trangThai: parsed.data.trangThai,
    nguoiThucHienId: req.auth!.sub,
  })
  res.json(order)
}
