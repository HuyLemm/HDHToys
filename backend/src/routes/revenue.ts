import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth.js"
import * as revenueController from "../controllers/revenue.controller.js"

export const revenueRouter = Router()

revenueRouter.use(requireAuth)

revenueRouter.get("/revenue/summary", revenueController.getSummary)
revenueRouter.get("/revenue/by-time", revenueController.getByTime)
revenueRouter.get("/revenue/by-category", revenueController.getByCategory)
revenueRouter.get("/revenue/by-product", revenueController.getByProduct)
revenueRouter.get("/revenue/units-sold-by-product", revenueController.getUnitsSoldByProduct)
revenueRouter.get("/revenue/by-staff", revenueController.getByStaff)
revenueRouter.get("/revenue/by-payment-method", revenueController.getByPaymentMethod)
revenueRouter.get("/revenue/inventory-turnover", revenueController.getInventoryTurnover)
revenueRouter.get("/revenue/repeat-customers", revenueController.getRepeatCustomers)
revenueRouter.get("/revenue/detail", revenueController.getDetail)
revenueRouter.get("/revenue/export", revenueController.exportCsv)
