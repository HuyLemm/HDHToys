import "express-async-errors"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import { apiLimiter } from "./middleware/rateLimit.js"
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
import { paymentsRouter } from "./routes/payments.js"
import { preordersRouter } from "./routes/preorders.js"
import { errorHandler } from "./middleware/errorHandler.js"

// Danh sách origin frontend được phép gọi API — KHÔNG dùng cors() mặc định
// (phản xạ mọi origin) vì token JWT lưu ở localStorage của SPA: nếu CORS mở
// toàn bộ, một trang bất kỳ có được token (rò rỉ qua XSS/kênh khác) có thể
// đọc thẳng response API bằng fetch() từ chính trang đó. Cấu hình qua env
// CORS_ORIGINS (phân tách bằng dấu phẩy); mặc định chỉ mở cho dev local.
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:8443")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

export const app = express()

// Render (và các PaaS tương tự) đặt app sau 1 lớp reverse proxy — không set
// dòng này thì req.ip/express-rate-limit đều thấy IP của proxy nội bộ (giống
// nhau cho MỌI request), làm rate limit theo IP (rateLimit.ts) và IP
// allowlist webhook (paymentConfig.ts) đều vô nghĩa. `1` = chỉ tin đúng 1
// lớp proxy (khớp hạ tầng Render), không tin toàn bộ chuỗi X-Forwarded-For
// (tránh giả mạo IP nếu deploy ở môi trường không có proxy tin cậy).
app.set("trust proxy", 1)

// contentSecurityPolicy: đây là API JSON/PDF/ảnh thuần, không phục vụ HTML
// nên CSP không có tác dụng — tắt để tránh header thừa gây nhiễu. Ngược lại
// crossOriginResourcePolicy PHẢI đổi từ default "same-origin" của helmet
// sang "cross-origin" — nếu không, browser sẽ tự chặn chính các request ảnh
// sản phẩm/PDF hóa đơn mà frontend (domain khác) đang fetch hợp lệ.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
)
// Giới hạn tường minh (mặc định express.json() cũng có giới hạn nhưng khá
// rộng) — 1MB đủ dư cho payload lớn nhất hiện có (đơn hàng nhiều dòng); ảnh
// sản phẩm đi qua multipart (multer, giới hạn riêng 3MB), không qua đây.
app.use(express.json({ limit: "1mb" }))
app.use("/api", apiLimiter)

app.use("/api", healthRouter)
app.use("/api", authRouter)
// Mount trước các router khác: mọi router "protected" dưới đây gọi
// `router.use(requireAuth)` chặn TOÀN BỘ request đi qua nó (không chỉ các
// route nó khớp) trước khi Express kịp thử router kế tiếp — nếu paymentsRouter
// (chứa endpoint webhook công khai, không yêu cầu JWT) mount sau, request
// webhook sẽ bị requireAuth của một router khác trả 401 trước khi tới được.
app.use("/api", paymentsRouter)
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
app.use("/api", preordersRouter)

// Must be registered after all routes.
app.use(errorHandler)
