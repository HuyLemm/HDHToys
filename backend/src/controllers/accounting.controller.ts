import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import * as accountingService from "../services/accounting.service.js"

export async function getOverview(_req: Request, res: Response) {
  res.json(await accountingService.getOverview())
}

export async function getBalance(_req: Request, res: Response) {
  res.json(await accountingService.getBalance())
}

const balanceUpdateSchema = z.object({
  tienMat: z.number().int().min(0).optional(),
  tienNganHang: z.number().int().min(0).optional(),
  vonChuSoHuu: z.number().int().min(0).optional(),
  taiSanKhac: z.number().int().min(0).optional(),
  chiPhiChuaThanhToan: z.number().int().min(0).optional(),
  khoanPhaiTraKhac: z.number().int().min(0).optional(),
})

export async function updateBalance(req: Request, res: Response) {
  const parsed = balanceUpdateSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")
  res.json(await accountingService.updateBalance(parsed.data))
}

export async function getBalanceSheet(_req: Request, res: Response) {
  res.json(await accountingService.getBalanceSheet())
}
