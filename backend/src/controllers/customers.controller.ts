import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as customersService from "../services/customers.service.js"

const listQuerySchema = z.object({
  q: z.string().optional(),
  hangKhachHang: z.enum(["NEW", "MEMBER", "VIP"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await customersService.list(parsed.data))
}

export async function get(req: Request, res: Response) {
  res.json(await customersService.get(req.params.id))
}

const createSchema = z.object({
  hoTen: z.string().min(1),
  sdt: z.string().min(1),
  email: z.string().email().optional(),
  ngaySinh: z.coerce.date().optional(),
  hangKhachHang: z.enum(["NEW", "MEMBER", "VIP"]).default("NEW"),
})

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.status(201).json(await customersService.create(parsed.data))
}

const updateSchema = z.object({
  hoTen: z.string().min(1).optional(),
  email: z.string().email().optional(),
  ngaySinh: z.coerce.date().optional(),
  hangKhachHang: z.enum(["NEW", "MEMBER", "VIP"]).optional(),
  diemTichLuy: z.number().int().min(0).optional(),
})

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.json(await customersService.update(req.params.id, parsed.data))
}

export async function getOverview(req: Request, res: Response) {
  res.json(await customersService.getOverview(req.params.id))
}

const ordersQuerySchema = z.object({
  trangThai: z.enum(["active", "MOI", "DANG_XU_LY", "HOAN_THANH", "DA_HUY", "HOAN_TIEN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function getOrders(req: Request, res: Response) {
  const parsed = ordersQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await customersService.getOrders({ customerId: req.params.id, ...parsed.data }))
}

export async function getProductsBought(req: Request, res: Response) {
  res.json(await customersService.getProductsBought(req.params.id))
}

export async function getInvoices(req: Request, res: Response) {
  res.json(await customersService.getInvoices(req.params.id))
}

export async function getNotes(req: Request, res: Response) {
  res.json(await customersService.getNotes(req.params.id))
}

const noteSchema = z.object({ noiDung: z.string().min(1) })

export async function addNote(req: Request, res: Response) {
  const parsed = noteSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Nội dung ghi chú không được để trống.")
  res.status(201).json(await customersService.addNote(req.params.id, parsed.data.noiDung, req.auth!.sub))
}
