import { Router } from "express"
import { requireAuth, requireRole } from "../middleware/requireAuth.js"
import * as staffController from "../controllers/staff.controller.js"

export const staffRouter = Router()

staffRouter.use(requireAuth)

staffRouter.get("/staff", requireRole("ADMIN"), staffController.list)
staffRouter.post("/staff", requireRole("ADMIN"), staffController.create)
staffRouter.patch("/staff/:id", requireRole("ADMIN"), staffController.update)
staffRouter.post("/staff/:id/reset-password", requireRole("ADMIN"), staffController.resetPassword)
staffRouter.delete("/staff/:id", requireRole("ADMIN"), staffController.remove)
