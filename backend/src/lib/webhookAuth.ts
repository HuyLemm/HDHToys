import { timingSafeEqual } from "node:crypto"
import { webhookSecret } from "./paymentConfig.js"

/**
 * Xác thực request webhook từ dịch vụ đối soát trung gian bằng shared secret
 * (thay cho JWT nội bộ — bên gọi không phải nhân viên). So sánh bằng
 * timingSafeEqual để tránh timing attack dò secret.
 */
export function verifyWebhookSecret(providedSecret: string | undefined): boolean {
  if (!webhookSecret || !providedSecret) return false
  const a = Buffer.from(providedSecret)
  const b = Buffer.from(webhookSecret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
