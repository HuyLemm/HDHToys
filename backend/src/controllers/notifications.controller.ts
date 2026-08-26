import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as notificationsService from "../services/notifications.service.js"

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await notificationsService.list(parsed.data))
}

export async function markRead(req: Request, res: Response) {
  res.json(await notificationsService.markRead(req.params.id))
}

export async function markAllRead(_req: Request, res: Response) {
  await notificationsService.markAllRead()
  res.json({ ok: true })
}
