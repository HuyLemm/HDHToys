import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as notificationsController from "../controllers/notifications.controller.js"

export const notificationsRouter = Router()

notificationsRouter.use(requireAuth)

notificationsRouter.get("/notifications", notificationsController.list)
notificationsRouter.patch("/notifications/read-all", notificationsController.markAllRead)
notificationsRouter.patch("/notifications/:id/read", notificationsController.markRead)
