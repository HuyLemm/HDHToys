import type { Request, Response } from "express"
import { z } from "zod"
import * as searchService from "../services/search.service.js"

const querySchema = z.object({ q: z.string().default("") })

export async function search(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query)
  const q = parsed.success ? parsed.data.q.trim() : ""
  res.json(await searchService.search(q))
}
