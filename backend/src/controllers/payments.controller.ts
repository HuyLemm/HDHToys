import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest, unauthorized } from "../errors/HttpError.js"
import { verifyWebhookSecret } from "../lib/webhookAuth.js"
import { webhookAllowedIps } from "../lib/paymentConfig.js"
import { logSecurityEvent } from "../lib/securityLog.js"
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

/** SePay (chế độ "API Key") gửi header `Authorization: Apikey <API_KEY_CUA_BAN>` — không phải Bearer JWT. */
function extractSePayApiKey(authHeader: string | undefined): string | undefined {
  const match = authHeader?.match(/^Apikey\s+(.+)$/i)
  return match?.[1]
}

export async function webhook(req: Request, res: Response) {
  // Lớp phòng thủ thứ 2, tùy chọn (VIETQR_WEBHOOK_ALLOWED_IPS) — bỏ qua nếu
  // chưa cấu hình. Dùng cùng thông báo lỗi với secret sai để không lộ cho
  // bên ngoài biết đã chặn ở lớp nào (IP hay secret).
  if (webhookAllowedIps.length > 0 && !webhookAllowedIps.includes(req.ip ?? "")) {
    logSecurityEvent("webhook_rejected", { reason: "ip_not_allowed", ip: req.ip })
    throw unauthorized("Webhook secret không hợp lệ.")
  }

  const provided = extractSePayApiKey(req.header("Authorization"))
  if (!verifyWebhookSecret(provided)) {
    logSecurityEvent("webhook_rejected", { reason: "bad_secret", ip: req.ip })
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
