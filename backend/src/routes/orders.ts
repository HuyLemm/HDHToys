import { Router } from "express"
import { requireAuth, requireRole } from "../middleware/requireAuth.js"
import * as ordersController from "../controllers/orders.controller.js"

export const ordersRouter = Router()

ordersRouter.use(requireAuth)

ordersRouter.get("/orders", ordersController.list)
ordersRouter.get("/orders/top-customers", ordersController.topCustomers)
ordersRouter.get("/orders/:id", ordersController.get)
ordersRouter.get("/orders/:id/qr.png", ordersController.qrImage)
ordersRouter.post("/orders", ordersController.create)
ordersRouter.patch("/orders/:id/status", ordersController.updateStatus)
ordersRouter.patch("/orders/:id/payment-status", ordersController.updatePaymentStatus)
ordersRouter.patch("/orders/:id/delivery", ordersController.updateDelivery)
ordersRouter.patch("/orders/:id/tracking-code", ordersController.updateTrackingCode)
ordersRouter.delete("/orders/:id", requireRole("ADMIN"), ordersController.remove)
