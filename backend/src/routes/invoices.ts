import { Router } from "express"
import { requireAuth, requireRole } from "../middleware/requireAuth.js"
import * as invoicesController from "../controllers/invoices.controller.js"

export const invoicesRouter = Router()

invoicesRouter.use(requireAuth)

invoicesRouter.get("/invoices", invoicesController.list)
invoicesRouter.get("/invoices/:id", invoicesController.get)
invoicesRouter.get("/invoices/:id/pdf", invoicesController.getPdf)
invoicesRouter.delete("/invoices/:id", requireRole("ADMIN"), invoicesController.remove)
