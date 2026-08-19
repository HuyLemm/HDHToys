import type { NextFunction, Request, Response } from "express"
import type { StaffRole } from "@prisma/client"
import { verifyToken, type AuthTokenPayload } from "../lib/auth.js"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined
  if (!token) {
    res.status(401).json({ error: "Thiếu token xác thực." })
    return
  }
  try {
    req.auth = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn." })
  }
}

export function requireRole(...roles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.vaiTro)) {
      res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này." })
      return
    }
    next()
  }
}
