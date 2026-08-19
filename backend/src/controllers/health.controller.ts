import type { Request, Response } from "express"
import { prisma } from "../lib/prisma.js"

export async function check(_req: Request, res: Response) {
  await prisma.$queryRaw`SELECT 1`
  res.json({ status: "ok", db: "connected" })
}
