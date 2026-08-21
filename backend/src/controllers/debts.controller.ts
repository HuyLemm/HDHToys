import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as debtsService from "../services/debts.service.js"

const listQuerySchema = z.object({
  loai: z.enum(["PHAI_THU", "PHAI_TRA"]).optional(),
  trangThai: z.enum(["CHUA_DEN_HAN", "SAP_DEN_HAN", "QUA_HAN", "DA_THANH_TOAN"]).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await debtsService.list(parsed.data))
}

export async function getSummary(_req: Request, res: Response) {
  res.json(await debtsService.getSummary())
}

export async function get(req: Request, res: Response) {
  res.json(await debtsService.get(req.params.id))
}

const createSchema = z.object({
  doiTuong: z.string().min(1),
  loai: z.enum(["PHAI_THU", "PHAI_TRA"]),
  ngayPhatSinh: z.coerce.date(),
  ngayDenHan: z.coerce.date(),
  soTien: z.number().int().min(1),
  daThanhToan: z.number().int().min(0).default(0),
})

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.status(201).json(await debtsService.create(parsed.data))
}

const updateSchema = z.object({
  doiTuong: z.string().min(1).optional(),
  ngayDenHan: z.coerce.date().optional(),
  soTien: z.number().int().min(1).optional(),
})

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.json(await debtsService.update(req.params.id, parsed.data))
}

const paymentSchema = z.object({ soTien: z.number().int().min(1) })

export async function pay(req: Request, res: Response) {
  const parsed = paymentSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Số tiền thanh toán không hợp lệ.")
  res.json(await debtsService.pay(req.params.id, parsed.data.soTien))
}

export async function remove(req: Request, res: Response) {
  await debtsService.remove(req.params.id)
  res.status(204).send()
}
