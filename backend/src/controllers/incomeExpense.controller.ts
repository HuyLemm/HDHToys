import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as incomeExpenseService from "../services/incomeExpense.service.js"

const listQuerySchema = z.object({
  loai: z.enum(["THU", "CHI"]).optional(),
  danhMuc: z.enum(["BAN_HANG", "NHAP_HANG", "VAN_CHUYEN", "LUONG", "DIEN_NUOC", "MARKETING", "KHAC"]).optional(),
  nguoiTaoId: z.string().optional(),
  range: z.enum(["hom_nay", "hom_qua", "7_ngay", "30_ngay", "thang_nay", "quy_nay", "nam_nay", "tuy_chinh"]).optional(),
  tuNgay: z.coerce.date().optional(),
  denNgay: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await incomeExpenseService.list(parsed.data))
}

export async function getSummary(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await incomeExpenseService.getSummary(parsed.data))
}

const createSchema = z.object({
  loai: z.enum(["THU", "CHI"]),
  danhMuc: z.enum(["BAN_HANG", "NHAP_HANG", "VAN_CHUYEN", "LUONG", "DIEN_NUOC", "MARKETING", "KHAC"]),
  noiDung: z.string().min(1),
  soTien: z.number().int().min(1),
})

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.status(201).json(await incomeExpenseService.create({ ...parsed.data, nguoiTaoId: req.auth!.sub }))
}

const updateSchema = z.object({
  danhMuc: z.enum(["BAN_HANG", "NHAP_HANG", "VAN_CHUYEN", "LUONG", "DIEN_NUOC", "MARKETING", "KHAC"]).optional(),
  noiDung: z.string().min(1).optional(),
  soTien: z.number().int().min(1).optional(),
})

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.json(await incomeExpenseService.update(req.params.id, parsed.data))
}
