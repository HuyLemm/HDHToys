import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { StaffRole } from "@prisma/client"

const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("Missing JWT_SECRET in environment")
  if (secret.length < 32 || secret === "change-me-to-a-random-string") {
    throw new Error(
      "JWT_SECRET is missing or looks like a placeholder. Generate a real one, e.g.:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    )
  }
  return secret
})()

export interface AuthTokenPayload {
  sub: string
  vaiTro: StaffRole
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10)
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" })
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload
}
