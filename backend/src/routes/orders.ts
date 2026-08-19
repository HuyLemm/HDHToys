import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as ordersController from "../controllers/orders.controller.js"

export const ordersRouter = Router()

ordersRouter.use(requireAuth)

ordersRouter.get("/orders", ordersController.list)
ordersRouter.get("/orders/:id", ordersController.get)
ordersRouter.post("/orders", ordersController.create)
ordersRouter.patch("/orders/:id/status", ordersController.updateStatus)
