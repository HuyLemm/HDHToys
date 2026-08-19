import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as productsService from "../services/products.service.js"

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
  giaVon: z.number().int().min(0),
  giaBan: z.number().int().min(0),
  tonKho: z.number().int().min(0).default(0),
  tonKhoToiThieu: z.number().int().min(0).default(0),
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
  giaVon: z.number().int().min(0).optional(),
  giaBan: z.number().int().min(0).optional(),
  tonKhoToiThieu: z.number().int().min(0).optional(),
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
