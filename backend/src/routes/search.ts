import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as searchController from "../controllers/search.controller.js"

export const searchRouter = Router()

searchRouter.use(requireAuth)

searchRouter.get("/search", searchController.search)
