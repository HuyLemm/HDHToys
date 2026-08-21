import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest, unauthorized } from "../errors/HttpError.js"
import { verifyWebhookSecret } from "../lib/webhookAuth.js"
import * as paymentsService from "../services/payments.service.js"

const webhookSchema = z.object({
  referenceCode: z.string().min(1),
  transferAmount: z.number().int(),
  content: z.string().min(1),
  gateway: z.string().optional(),
  transactionDate: z.string().optional(),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
})

export async function webhook(req: Request, res: Response) {
  const provided = req.header("X-Webhook-Secret")
  if (!verifyWebhookSecret(provided)) {
    throw unauthorized("Webhook secret không hợp lệ.")
  }

  const parsed = webhookSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Payload webhook không hợp lệ.")

  const result = await paymentsService.recordAndReconcile(parsed.data)
  res.status(200).json({
    received: true,
    duplicate: result.duplicate,
    trangThaiDoiSoat: result.transaction.trangThaiDoiSoat,
  })
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function listUnmatched(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await paymentsService.listUnmatched(parsed.data))
}
