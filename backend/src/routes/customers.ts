import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as customersController from "../controllers/customers.controller.js"

export const customersRouter = Router()

customersRouter.use(requireAuth)

customersRouter.get("/customers", customersController.list)
customersRouter.get("/customers/:id", customersController.get)
customersRouter.post("/customers", customersController.create)
customersRouter.patch("/customers/:id", customersController.update)
customersRouter.get("/customers/:id/overview", customersController.getOverview)
customersRouter.get("/customers/:id/orders", customersController.getOrders)
customersRouter.get("/customers/:id/products", customersController.getProductsBought)
customersRouter.get("/customers/:id/invoices", customersController.getInvoices)
customersRouter.get("/customers/:id/notes", customersController.getNotes)
customersRouter.post("/customers/:id/notes", customersController.addNote)
customersRouter.delete("/customers/:id/notes/:noteId", customersController.removeNote)
customersRouter.delete("/customers/:id", customersController.remove)
