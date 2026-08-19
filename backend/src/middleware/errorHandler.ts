import type { ErrorRequestHandler } from "express"
import { Prisma } from "@prisma/client"
import { HttpError } from "../errors/HttpError.js"

// Registered after all routes in app.ts. `express-async-errors` forwards
// rejected promises from async route handlers here instead of crashing the
// process — e.g. a transient Neon cold-start connection error used to take
// the whole server down.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  console.error(err)

  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P1001" || err.code === "P1002")) {
    res.status(503).json({ error: "Không thể kết nối cơ sở dữ liệu, vui lòng thử lại sau vài giây." })
    return
  }

  res.status(500).json({ error: "Đã xảy ra lỗi hệ thống." })
}
