import { Router } from "express"
import { requireAuth, requireRole } from "../middleware/requireAuth.js"
import * as accountingController from "../controllers/accounting.controller.js"

export const accountingRouter = Router()

accountingRouter.use(requireAuth)

accountingRouter.get("/accounting/overview", accountingController.getOverview)
accountingRouter.get("/accounting/balance", accountingController.getBalance)
accountingRouter.patch("/accounting/balance", requireRole("ADMIN", "ACCOUNTANT"), accountingController.updateBalance)
accountingRouter.get("/accounting/balance-sheet", accountingController.getBalanceSheet)
