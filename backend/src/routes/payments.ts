import { Router } from "express"
import { requireAuth, requireRole } from "../middleware/requireAuth.js"
import * as paymentsController from "../controllers/payments.controller.js"

export const paymentsRouter = Router()

// Không dùng requireAuth: bên gọi là dịch vụ đối soát trung gian (bên thứ 3),
// không phải nhân viên — xác thực bằng secret riêng (verifyWebhookSecret).
paymentsRouter.post("/payments/vietqr/webhook", paymentsController.webhook)

// Dữ liệu đối soát tài chính — cùng mức nhạy cảm với accounting.ts (sửa bảng
// cân đối), nên giới hạn cùng vai trò thay vì để mọi nhân viên đã đăng nhập xem.
paymentsRouter.get("/payments/unmatched", requireAuth, requireRole("ADMIN", "ACCOUNTANT"), paymentsController.listUnmatched)
