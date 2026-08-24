import type { Request, Response } from "express"
import { z } from "zod"
import QRCode from "qrcode"
import { badRequest } from "../errors/HttpError.js"
import * as ordersService from "../services/orders.service.js"

const listQuerySchema = z.object({
  q: z.string().optional(),
  trangThai: z.enum(["MOI", "DANG_XU_LY", "HOAN_THANH", "DA_HUY", "HOAN_TIEN"]).optional(),
  khachHangId: z.string().optional(),
  nhanVienId: z.string().optional(),
  phuongThucThanhToan: z.enum(["TIEN_MAT", "CHUYEN_KHOAN", "THE", "QR_CODE"]).optional(),
  // z.coerce.boolean() coi mọi chuỗi non-empty (kể cả "false") là true — dùng
  // enum + transform để đọc đúng "true"/"false" từ query string.
  daThanhToan: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  phuongThucNhanHang: z.enum(["KHACH_TOI_LAY", "SHIP"]).optional(),
  coMaVanDon: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  tuNgay: z.coerce.date().optional(),
  denNgay: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "tongCong"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số tìm kiếm không hợp lệ.")
  res.json(await ordersService.list(parsed.data))
}

const topCustomersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
})

export async function topCustomers(req: Request, res: Response) {
  const parsed = topCustomersQuerySchema.safeParse(req.query)
  if (!parsed.success) throw badRequest("Tham số không hợp lệ.")
  res.json({ items: await ordersService.getTopCustomers(parsed.data.limit) })
}

export async function get(req: Request, res: Response) {
  const order = await ordersService.get(req.params.id)
  res.json({ ...order, qrCode: ordersService.getQrPaymentInfo(order) })
}

/** Ảnh QR VietQR (PNG) cho một đơn hàng đang chờ thanh toán qua QR — xem SDS mục 4.14. */
export async function qrImage(req: Request, res: Response) {
  const order = await ordersService.get(req.params.id)
  const info = ordersService.getQrPaymentInfo(order)
  if (!info || !info.payload) {
    throw badRequest(
      !info
        ? "Đơn hàng này không dùng phương thức thanh toán QR Code hoặc đã xử lý xong."
        : "Chưa cấu hình tài khoản ngân hàng nhận thanh toán QR (VIETQR_BANK_BIN/VIETQR_ACCOUNT_NO).",
    )
  }
  const png = await QRCode.toBuffer(info.payload, { type: "png", margin: 1, width: 320 })
  res.setHeader("Content-Type", "image/png")
  res.send(png)
}

const itemSchema = z.object({
  productId: z.string().min(1),
  soLuong: z.number().int().min(1),
  // min(1) không phải min(0): giá 0 nghĩa là "cho không" một cách vô hình,
  // khác với giảm giá (giamGia) — cách hợp lệ để tặng/giảm hẳn 100% là dùng
  // giamGia = soLuong * đơn giá, có ghi rõ số tiền giảm trên đơn/hóa đơn.
  giaOverride: z.number().int().min(1, "Đơn giá ghi đè phải lớn hơn 0.").optional(),
  giamGia: z.number().int().min(0).default(0),
})

const createSchema = z.object({
  khachHangId: z.string().min(1),
  nhanVienId: z.string().optional(),
  kenhBan: z.enum(["TAI_CUA_HANG", "DIEN_THOAI", "FACEBOOK", "ZALO", "TIKTOK", "KHAC"]).default("TAI_CUA_HANG"),
  phuongThucThanhToan: z.enum(["TIEN_MAT", "CHUYEN_KHOAN", "THE", "QR_CODE"]),
  phuongThucNhanHang: z.enum(["KHACH_TOI_LAY", "SHIP"]).optional(),
  donViVanChuyen: z.enum(["SPX", "GRAB", "KHAC"]).optional(),
  phiShip: z.number().int().min(0).default(0),
  tienCoc: z.number().int().min(0).default(0),
  ghiChu: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.")

  const order = await ordersService.create({ ...parsed.data, fallbackNhanVienId: req.auth!.sub })
  res.status(201).json(order)
}

const statusSchema = z.object({
  trangThai: z.enum(["MOI", "DANG_XU_LY", "HOAN_THANH", "DA_HUY", "HOAN_TIEN"]),
})

export async function remove(req: Request, res: Response) {
  await ordersService.remove(req.params.id)
  res.status(204).send()
}

export async function updateStatus(req: Request, res: Response) {
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Trạng thái không hợp lệ.")

  const order = await ordersService.updateStatus({
    orderId: req.params.id,
    trangThai: parsed.data.trangThai,
    nguoiThucHienId: req.auth!.sub,
  })
  res.json(order)
}

const paymentStatusSchema = z.object({ daThanhToan: z.boolean() })

export async function updatePaymentStatus(req: Request, res: Response) {
  const parsed = paymentStatusSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Trạng thái thanh toán không hợp lệ.")

  const order = await ordersService.updatePaymentStatus(req.params.id, parsed.data.daThanhToan)
  res.json(order)
}

const deliverySchema = z.object({
  phuongThucNhanHang: z.enum(["KHACH_TOI_LAY", "SHIP"]),
  donViVanChuyen: z.enum(["SPX", "GRAB", "KHAC"]).optional(),
})

export async function updateDelivery(req: Request, res: Response) {
  const parsed = deliverySchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Phương thức nhận hàng không hợp lệ.")

  const order = await ordersService.updateDelivery(req.params.id, parsed.data.phuongThucNhanHang, parsed.data.donViVanChuyen)
  res.json(order)
}

const trackingSchema = z.object({ maVanDon: z.string().optional() })

export async function updateTrackingCode(req: Request, res: Response) {
  const parsed = trackingSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Mã vận đơn không hợp lệ.")

  const order = await ordersService.updateTrackingCode(req.params.id, parsed.data.maVanDon)
  res.json(order)
}

const shippingFeeSchema = z.object({ phiShip: z.number().int().min(0) })

export async function updateShippingFee(req: Request, res: Response) {
  const parsed = shippingFeeSchema.safeParse(req.body)
  if (!parsed.success) throw badRequest("Phí vận chuyển không hợp lệ.")

  const order = await ordersService.updateShippingFee(req.params.id, parsed.data.phiShip)
  res.json(order)
}
