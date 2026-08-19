import "express-async-errors"
import express from "express"
import cors from "cors"
import { healthRouter } from "./routes/health.js"
import { authRouter } from "./routes/auth.js"
import { staffRouter } from "./routes/staff.js"
import { productsRouter } from "./routes/products.js"
import { customersRouter } from "./routes/customers.js"
import { ordersRouter } from "./routes/orders.js"
import { inventoryRouter } from "./routes/inventory.js"
import { invoicesRouter } from "./routes/invoices.js"
import { searchRouter } from "./routes/search.js"
import { revenueRouter } from "./routes/revenue.js"
import { incomeExpenseRouter } from "./routes/incomeExpense.js"
import { debtsRouter } from "./routes/debts.js"
import { accountingRouter } from "./routes/accounting.js"
import { errorHandler } from "./middleware/errorHandler.js"

export const app = express()

app.use(cors())
app.use(express.json())

app.use("/api", healthRouter)
app.use("/api", authRouter)
app.use("/api", staffRouter)
app.use("/api", productsRouter)
app.use("/api", customersRouter)
app.use("/api", ordersRouter)
app.use("/api", inventoryRouter)
app.use("/api", invoicesRouter)
app.use("/api", searchRouter)
app.use("/api", revenueRouter)
app.use("/api", incomeExpenseRouter)
app.use("/api", debtsRouter)
app.use("/api", accountingRouter)

// Must be registered after all routes.
app.use(errorHandler)
