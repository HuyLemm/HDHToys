import { Router } from "express"
import { requireAuth, requireRole } from "../middleware/requireAuth.js"
import * as securityLogController from "../controllers/securityLog.controller.js"

export const securityLogRouter = Router()

securityLogRouter.use(requireAuth)
securityLogRouter.use(requireRole("ADMIN"))

securityLogRouter.get("/security-logs", securityLogController.list)
securityLogRouter.get("/security-logs/event-types", securityLogController.listEventTypes)
