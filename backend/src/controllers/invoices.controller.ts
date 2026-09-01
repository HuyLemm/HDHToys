import type { Request, Response } from "express"
import { z } from "zod"
import { badRequest } from "../errors/HttpError.js"
import { renderInvoicePdf } from "../lib/invoicePdf.js"
import * as invoicesService from "../services/invoices.service.js"
import * as productsService from "../services/products.service.js"

const listQuerySchema = z.object({
  q: z.string().optional(),
  khachHangId: z.string().optional(),
  phuongThucThanhToan: z.enum(["TIEN_MAT", "CHUYEN_KHOAN", "THE", "QR_CODE"]).optional(),
  nguoiTaoId: z.string().optional(),
  tuNgay: z.coerce.date().optional(),
  denNgay: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await invoicesService.list(parsed.data))
}

export async function get(req: Request, res: Response) {
  res.json(await invoicesService.get(req.params.id))
}

export async function getPdf(req: Request, res: Response) {
  const invoice = await invoicesService.get(req.params.id)
  const images = await productsService.getImagesForProducts(invoice.order.items.map((i) => i.productId))
  const invoiceWithImages = {
    ...invoice,
    order: { ...invoice.order, items: invoice.order.items.map((i) => ({ ...i, product: { ...i.product, anh: images.get(i.productId) } })) },
  }
  await renderInvoicePdf(invoiceWithImages, res)
}

export async function remove(req: Request, res: Response) {
  await invoicesService.remove(req.params.id)
  res.status(204).send()
}
