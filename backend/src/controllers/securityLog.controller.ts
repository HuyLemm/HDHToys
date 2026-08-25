import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as securityLogService from "../services/securityLog.service.js"

const listQuerySchema = z.object({
  event: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await securityLogService.list(parsed.data))
}

export async function listEventTypes(_req: Request, res: Response) {
  res.json({ items: await securityLogService.listEventTypes() })
}
