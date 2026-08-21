import { Router } from "express"
import { requireAuth, requireRole } from "../middleware/requireAuth.js"
import * as productsController from "../controllers/products.controller.js"

export const productsRouter = Router()

productsRouter.use(requireAuth)

const mutationRoles = ["ADMIN", "MANAGER", "INVENTORY_STAFF"] as const

productsRouter.get("/products", productsController.list)
productsRouter.get("/products/:id", productsController.get)
productsRouter.post("/products", requireRole(...mutationRoles), productsController.create)
productsRouter.patch("/products/:id", requireRole(...mutationRoles), productsController.update)
productsRouter.post("/products/:id/discontinue", requireRole("ADMIN", "MANAGER"), productsController.discontinue)
productsRouter.post("/products/:id/reactivate", requireRole("ADMIN", "MANAGER"), productsController.reactivate)
productsRouter.delete("/products/:id", requireRole(...mutationRoles), productsController.remove)
productsRouter.get("/products/:id/image", productsController.getImage)
productsRouter.post("/products/:id/image", requireRole(...mutationRoles), productsController.handleImageUpload, productsController.uploadImage)
productsRouter.delete("/products/:id/image", requireRole(...mutationRoles), productsController.deleteImage)
