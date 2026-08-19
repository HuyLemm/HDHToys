import PDFDocument from "pdfkit"
import type { Response } from "express"
import { resolveUnicodeFontPath } from "./pdfFont.js"

function formatDate(d: Date) {
  return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
}

function formatMoney(n: number) {
  return `${n.toLocaleString("vi-VN")} VNĐ`
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  TIEN_MAT: "Tiền mặt",
  CHUYEN_KHOAN: "Chuyển khoản",
  THE: "Thẻ",
  QR_CODE: "QR Code",
}

export interface InvoicePdfData {
  soHoaDon: string
  createdAt: Date
  order: {
    ma: string
    phuongThucThanhToan: string
    tamTinh: number
    giamGia: number
    vat: number
    tongCong: number
    khachHang: { hoTen: string; sdt: string }
    nhanVien: { hoTen: string }
    items: { soLuong: number; donGia: number; thanhTien: number; product: { sku: string; ten: string } }[]
  }
}

export function renderInvoicePdf(invoice: InvoicePdfData, res: Response) {
  const doc = new PDFDocument({ size: "A5", margin: 36 })
  const fontPath = resolveUnicodeFontPath()
  if (fontPath) {
    doc.registerFont("body", fontPath)
    doc.font("body")
  }

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `inline; filename="${invoice.soHoaDon}.pdf"`)
  doc.pipe(res)

  doc.fontSize(16).text("HDH TOYS", { align: "center" })
  doc.fontSize(10).text("Hệ thống quản lý bán lẻ đồ chơi", { align: "center" })
  doc.moveDown(1)
  doc.fontSize(12).text(`Hóa đơn: ${invoice.soHoaDon}`, { align: "center" })
  doc.moveDown(1)

  doc.fontSize(10)
  doc.text(`Ngày: ${formatDate(invoice.createdAt)}    Giờ: ${formatTime(invoice.createdAt)}`)
  doc.text(`Mã đơn: ${invoice.order.ma}`)
  doc.text(`Nhân viên: ${invoice.order.nhanVien.hoTen}`)
  doc.text(`Khách hàng: ${invoice.order.khachHang.hoTen}  -  ${invoice.order.khachHang.sdt}`)
  doc.moveDown(1)

  doc.font(fontPath ? "body" : "Helvetica-Bold").text("Sản phẩm", { continued: false })
  doc.moveDown(0.5)
  for (const item of invoice.order.items) {
    doc.text(`${item.product.ten} (${item.product.sku})`)
    doc.text(`  ${item.soLuong} x ${formatMoney(item.donGia)} = ${formatMoney(item.thanhTien)}`)
  }
  doc.moveDown(1)

  doc.text(`Tạm tính: ${formatMoney(invoice.order.tamTinh)}`)
  doc.text(`Giảm giá: ${formatMoney(invoice.order.giamGia)}`)
  doc.text(`VAT: ${formatMoney(invoice.order.vat)}`)
  doc.fontSize(12).text(`Tổng cộng: ${formatMoney(invoice.order.tongCong)}`)
  doc.fontSize(10).moveDown(0.5)
  doc.text(`Phương thức thanh toán: ${PAYMENT_METHOD_LABEL[invoice.order.phuongThucThanhToan] ?? invoice.order.phuongThucThanhToan}`)

  doc.end()
}
