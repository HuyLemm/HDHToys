import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as authService from "../services/auth.service.js"

const loginSchema = z.object({
  email: z.string().email(),
  matKhau: z.string().min(1),
})

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Email hoặc mật khẩu không hợp lệ.")

  const result = await authService.login(parsed.data.email, parsed.data.matKhau)
  res.json(result)
}

export async function me(req: Request, res: Response) {
  res.json(await authService.me(req.auth!.sub))
}
