import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as staffService from "../services/staff.service.js"

export async function list(_req: Request, res: Response) {
  res.json(await staffService.list())
}

const createSchema = z.object({
  hoTen: z.string().min(1),
  email: z.string().email(),
  matKhau: z.string().min(6),
  vaiTro: z.enum(["ADMIN", "MANAGER", "ACCOUNTANT", "INVENTORY_STAFF"]),
})

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")

  const staff = await staffService.create(parsed.data)
  res.status(201).json(staff)
}

const updateSchema = z.object({
  hoTen: z.string().min(1).optional(),
  vaiTro: z.enum(["ADMIN", "MANAGER", "ACCOUNTANT", "INVENTORY_STAFF"]).optional(),
  trangThai: z.enum(["ACTIVE", "LOCKED"]).optional(),
})

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")

  const staff = await staffService.update(req.params.id, parsed.data)
  res.json(staff)
}

const resetPasswordSchema = z.object({ matKhauMoi: z.string().min(6) })

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Mật khẩu mới phải có ít nhất 6 ký tự.")

  await staffService.resetPassword(req.params.id, parsed.data.matKhauMoi)
  res.json({ ok: true })
}

export async function remove(req: Request, res: Response) {
  await staffService.remove(req.params.id, req.auth!.sub)
  res.status(204).send()
}
