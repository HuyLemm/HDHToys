import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as authController from "../controllers/auth.controller.js"

export const authRouter = Router()

authRouter.post("/auth/login", authController.login)
authRouter.get("/auth/me", requireAuth, authController.me)
