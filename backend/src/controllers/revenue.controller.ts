import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import type { RangeKey } from "../lib/dateRange.js"
import * as revenueService from "../services/revenue.service.js"

const rangeSchema = z.object({
  range: z.enum(["hom_nay", "hom_qua", "7_ngay", "30_ngay", "thang_nay", "quy_nay", "nam_nay", "tuy_chinh"]).default("7_ngay"),
  tuNgay: z.coerce.date().optional(),
  denNgay: z.coerce.date().optional(),
})

function parseRange(query: unknown) {
  const parsed = rangeSchema.safeParse(query)
  if (!parsed.success) throw badRequest("Tham số khoảng thời gian không hợp lệ.")
  return revenueService.resolveRange(parsed.data.range as RangeKey, parsed.data.tuNgay, parsed.data.denNgay)
}

export async function getSummary(req: Request, res: Response) {
  const { tuNgay, denNgay } = parseRange(req.query)
  res.json(await revenueService.getSummary(tuNgay, denNgay))
}

export async function getByTime(req: Request, res: Response) {
  const { tuNgay, denNgay } = parseRange(req.query)
  res.json(await revenueService.getByTime(tuNgay, denNgay))
}

export async function getByCategory(req: Request, res: Response) {
  const { tuNgay, denNgay } = parseRange(req.query)
  res.json(await revenueService.getByCategory(tuNgay, denNgay))
}

export async function getByProduct(req: Request, res: Response) {
  const { tuNgay, denNgay } = parseRange(req.query)
  res.json(await revenueService.getByProduct(tuNgay, denNgay))
}

export async function getByStaff(req: Request, res: Response) {
  const { tuNgay, denNgay } = parseRange(req.query)
  res.json(await revenueService.getByStaff(tuNgay, denNgay))
}

export async function getByPaymentMethod(req: Request, res: Response) {
  const { tuNgay, denNgay } = parseRange(req.query)
  res.json(await revenueService.getByPaymentMethod(tuNgay, denNgay))
}

const detailQuerySchema = rangeSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function getDetail(req: Request, res: Response) {
  const parsed = detailQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số không hợp lệ.")
  const { tuNgay, denNgay } = revenueService.resolveRange(parsed.data.range as RangeKey, parsed.data.tuNgay, parsed.data.denNgay)
  res.json(await revenueService.getDetail(tuNgay, denNgay, parsed.data.page, parsed.data.pageSize))
}

export async function exportCsv(req: Request, res: Response) {
  const { tuNgay, denNgay } = parseRange(req.query)
  const csv = await revenueService.exportCsv(tuNgay, denNgay)

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="doanh-thu.csv"`)
  res.send(`﻿${csv}`)
}
