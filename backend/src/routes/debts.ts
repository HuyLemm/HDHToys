import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as debtsController from "../controllers/debts.controller.js"

export const debtsRouter = Router()

debtsRouter.use(requireAuth)

debtsRouter.get("/debts", debtsController.list)
debtsRouter.get("/debts/summary", debtsController.getSummary)
debtsRouter.get("/debts/:id", debtsController.get)
debtsRouter.post("/debts", debtsController.create)
debtsRouter.patch("/debts/:id", debtsController.update)
debtsRouter.patch("/debts/:id/payment", debtsController.pay)
