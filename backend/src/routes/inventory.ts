import { Router } from "express"
import { requireAuth, requireRole } from "../middleware/requireAuth.js"
import * as inventoryController from "../controllers/inventory.controller.js"

export const inventoryRouter = Router()

inventoryRouter.use(requireAuth)

const mutationRoles = ["ADMIN", "MANAGER", "INVENTORY_STAFF"] as const

inventoryRouter.get("/inventory/summary", inventoryController.getSummary)
inventoryRouter.get("/inventory", inventoryController.list)
inventoryRouter.post("/inventory/stock-in", requireRole(...mutationRoles), inventoryController.stockIn)
inventoryRouter.post("/inventory/stock-out", requireRole(...mutationRoles), inventoryController.stockOut)
inventoryRouter.post("/inventory/adjust", requireRole(...mutationRoles), inventoryController.adjust)
inventoryRouter.get("/inventory/history", inventoryController.getHistory)
inventoryRouter.delete("/inventory/history/:id", requireRole("ADMIN"), inventoryController.removeTransaction)
