import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as paymentsController from "../controllers/payments.controller.js"

export const paymentsRouter = Router()

// Không dùng requireAuth: bên gọi là dịch vụ đối soát trung gian (bên thứ 3),
// không phải nhân viên — xác thực bằng secret riêng (verifyWebhookSecret).
paymentsRouter.post("/payments/vietqr/webhook", paymentsController.webhook)

paymentsRouter.get("/payments/unmatched", requireAuth, paymentsController.listUnmatched)
