import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as incomeExpenseController from "../controllers/incomeExpense.controller.js"

export const incomeExpenseRouter = Router()

incomeExpenseRouter.use(requireAuth)

incomeExpenseRouter.get("/income-expense", incomeExpenseController.list)
incomeExpenseRouter.get("/income-expense/summary", incomeExpenseController.getSummary)
incomeExpenseRouter.post("/income-expense", incomeExpenseController.create)
incomeExpenseRouter.patch("/income-expense/:id", incomeExpenseController.update)
