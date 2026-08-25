import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as inventoryService from "../services/inventory.service.js"

export async function getSummary(_req: Request, res: Response) {
  res.json(await inventoryService.getSummary())
}

const listQuerySchema = z.object({
  q: z.string().optional(),
  danhMuc: z.string().optional(),
  nhaCungCap: z.string().optional(),
  trangThai: z.enum(["CON_HANG", "SAP_HET", "HET_HANG", "NGUNG_KINH_DOANH"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await inventoryService.list(parsed.data))
}

const stockInSchema = z.object({
  productId: z.string().min(1),
  soLuong: z.number().int().min(1),
  thamChieu: z.string().optional(),
  ghiChu: z.string().optional(),
})

export async function stockIn(req: Request, res: Response) {
  const parsed = stockInSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  const transaction = await inventoryService.stockIn({ ...parsed.data, nguoiThucHienId: req.auth!.sub })
  res.status(201).json(transaction)
}

const stockOutSchema = stockInSchema

export async function stockOut(req: Request, res: Response) {
  const parsed = stockOutSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  const transaction = await inventoryService.stockOut({ ...parsed.data, nguoiThucHienId: req.auth!.sub })
  res.status(201).json(transaction)
}

const adjustSchema = z.object({
  productId: z.string().min(1),
  tonKhoMoi: z.number().int().min(0),
  ghiChu: z.string().optional(),
})

export async function adjust(req: Request, res: Response) {
  const parsed = adjustSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  const transaction = await inventoryService.adjust({ ...parsed.data, nguoiThucHienId: req.auth!.sub })
  res.status(201).json(transaction)
}

const historyQuerySchema = z.object({
  q: z.string().optional(),
  productId: z.string().optional(),
  loai: z.enum(["NHAP", "XUAT", "DIEU_CHINH", "TRA_HANG"]).optional(),
  nguoiThucHienId: z.string().optional(),
  tuNgay: z.coerce.date().optional(),
  denNgay: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function getHistory(req: Request, res: Response) {
  const parsed = historyQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await inventoryService.getHistory(parsed.data))
}

export async function removeTransaction(req: Request, res: Response) {
  await inventoryService.removeTransaction(req.params.id)
  res.status(204).send()
}
