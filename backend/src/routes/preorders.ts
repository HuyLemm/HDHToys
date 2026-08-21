import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as preordersController from "../controllers/preorders.controller.js"

export const preordersRouter = Router()

preordersRouter.use(requireAuth)

preordersRouter.get("/preorders", preordersController.list)
preordersRouter.get("/preorders/summary", preordersController.summary)
preordersRouter.get("/preorders/:id", preordersController.get)
preordersRouter.post("/preorders", preordersController.create)
preordersRouter.patch("/preorders/:id", preordersController.update)
preordersRouter.post("/preorders/:id/cancel", preordersController.cancel)
preordersRouter.delete("/preorders/:id", preordersController.remove)
preordersRouter.post("/preorders/:id/convert-to-order", preordersController.convertToOrder)
