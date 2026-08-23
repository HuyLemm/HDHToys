import type { NextFunction, Request, Response } from "express"
import type { StaffRole } from "@prisma/client"
import { verifyToken, type AuthTokenPayload } from "../lib/auth.js"
import { prisma } from "../lib/prisma.js"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload
    }
  }
}

/**
 * Ngoài verify chữ ký/hạn JWT, còn tra lại Staff để kiểm tra tokenVersion
 * khớp và tài khoản chưa bị khóa — đây là cách "thu hồi" một token đang tồn
 * tại (JWT vốn stateless, không tự hết hạn sớm được): Admin reset mật khẩu
 * hoặc khóa tài khoản có hiệu lực NGAY, không phải chờ hết hạn 8h. Đổi lại
 * mỗi request tốn thêm 1 lượt tra Staff theo PK — chấp nhận được ở quy mô 1
 * cửa hàng.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined
  if (!token) {
    res.status(401).json({ error: "Thiếu token xác thực." })
    return
  }
  try {
    const payload = verifyToken(token)
    const staff = await prisma.staff.findUnique({
      where: { id: payload.sub },
      select: { trangThai: true, tokenVersion: true },
    })
    if (!staff || staff.trangThai === "LOCKED" || staff.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn." })
      return
    }
    req.auth = payload
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
