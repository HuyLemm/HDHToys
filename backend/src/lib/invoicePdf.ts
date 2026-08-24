import PDFDocument from "pdfkit"
import QRCode from "qrcode"
import type { Response } from "express"
import { resolveUnicodeFontPath, resolveUnicodeBoldFontPath } from "./pdfFont.js"
import { storeConfig, resolveLogoPath } from "./storeConfig.js"

function formatDate(d: Date) {
  return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
}

function formatMoney(n: number) {
  return `${n.toLocaleString("vi-VN")} VNĐ`
}

export interface InvoicePdfData {
  soHoaDon: string
  createdAt: Date
  /** true = đơn chưa Hoàn thành, đây chỉ là phiếu tạm tính in trước — không phải hóa đơn chính thức (chưa có số hóa đơn thật). */
  provisional?: boolean
  order: {
    ma: string
    kenhBan: string
    ghiChu: string | null
    phuongThucThanhToan: string
    phuongThucNhanHang: string
    donViVanChuyen: string | null
    maVanDon: string | null
    tamTinh: number
    giamGia: number
    phiShip: number
    tongCong: number
    tienCoc: number
    khachHang: { hoTen: string; sdt: string; email: string | null; diaChi: string | null }
    nhanVien: { hoTen: string }
    items: { soLuong: number; donGia: number; thanhTien: number; product: { sku: string; ten: string; loaiSanPham: string } }[]
    preorder?: { ma: string } | null
    paymentTransactions?: { maGiaoDichNganHang: string }[]
  }
}

const PAGE_MARGIN = 40
const NAVY = "#1e3a5f"
const ACCENT = "#2563eb"
const PROVISIONAL_ACCENT = "#b45309"
const TEXT = "#0f172a"
const MUTED = "#64748b"
const BORDER = "#e2e8f0"
const PANEL_BG = "#eff6ff"

export async function renderInvoicePdf(invoice: InvoicePdfData, res: Response) {
  // Sinh QR trước khi bắt đầu vẽ PDF — doc.image() cần buffer đã có sẵn
  // (không nhận Promise), và một khi doc.pipe(res)/doc.end() chạy thì
  // không còn chỗ nào await được nữa.
  const socialLinks: { label: string; qr: Buffer }[] = []
  for (const [label, url] of [
    ["Theo dõi Facebook", storeConfig.facebookUrl],
    ["Cộng đồng Zalo", storeConfig.zaloUrl],
  ] as const) {
    if (url) socialLinks.push({ label, qr: await QRCode.toBuffer(url, { type: "png", margin: 1, width: 160 }) })
  }

  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN })
  const fontPath = resolveUnicodeFontPath()
  const boldFontPath = resolveUnicodeBoldFontPath()
  if (fontPath) doc.registerFont("body", fontPath)
  if (boldFontPath) doc.registerFont("bold", boldFontPath)
  const bodyFont = fontPath ? "body" : "Helvetica"
  const boldFont = boldFontPath ? "bold" : "Helvetica-Bold"
  doc.font(bodyFont)

  const pageWidth = doc.page.width
  const contentWidth = pageWidth - PAGE_MARGIN * 2
  const rightEdge = pageWidth - PAGE_MARGIN

  const filenameSlug = invoice.provisional ? `Tam-tinh-${invoice.order.ma}` : invoice.soHoaDon
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `inline; filename="${filenameSlug}.pdf"`)
  doc.pipe(res)

  // ─── Header: logo + tên cửa hàng bên trái, "HÓA ĐƠN ĐIỆN TỬ" bên phải ─────
  const logoPath = resolveLogoPath()
  const logoDiameter = 52
  if (logoPath) {
    const r = logoDiameter / 2
    const cx = PAGE_MARGIN + r
    const cy = PAGE_MARGIN + r
    doc.save()
    doc.circle(cx, cy, r).clip()
    doc.image(logoPath, cx - r, cy - r, { width: logoDiameter, height: logoDiameter })
    doc.restore()
    doc.circle(cx, cy, r).lineWidth(1).strokeColor(BORDER).stroke()
  }
  const textX = PAGE_MARGIN + (logoPath ? logoDiameter + 12 : 0)
  doc.font(boldFont).fontSize(18).fillColor(NAVY).text(storeConfig.name, textX, PAGE_MARGIN, { lineBreak: false })
  doc.font(bodyFont).fontSize(9).fillColor(MUTED).text(storeConfig.tagline, textX, PAGE_MARGIN + 22, { lineBreak: false })
  const contactLine = [storeConfig.hotline && `Hotline: ${storeConfig.hotline}`, storeConfig.website]
    .filter(Boolean)
    .join("  ·  ")
  if (contactLine) {
    doc.font(bodyFont).fontSize(8).fillColor(MUTED).text(contactLine, textX, PAGE_MARGIN + 36, { lineBreak: false })
  }

  const docAccent = invoice.provisional ? PROVISIONAL_ACCENT : ACCENT
  doc.font(boldFont).fontSize(15).fillColor(docAccent).text(invoice.provisional ? "PHIẾU TẠM TÍNH" : "HÓA ĐƠN ĐIỆN TỬ", PAGE_MARGIN, PAGE_MARGIN + 2, { width: contentWidth, align: "right" })
  doc.font(bodyFont).fontSize(9).fillColor(MUTED)
  doc.text(`Mã đơn: ${invoice.order.ma}`, PAGE_MARGIN, PAGE_MARGIN + 22, { width: contentWidth, align: "right" })
  doc.text(`Ngày lập: ${formatDate(invoice.createdAt)} · ${formatTime(invoice.createdAt)}`, PAGE_MARGIN, PAGE_MARGIN + 34, { width: contentWidth, align: "right" })

  const headerBottom = PAGE_MARGIN + 58
  doc.moveTo(PAGE_MARGIN, headerBottom).lineTo(rightEdge, headerBottom).lineWidth(1.5).strokeColor(docAccent).stroke()

  // ─── Hai ô: thông tin cửa hàng / thông tin khách hàng ─────────────────────
  function drawInfoPanel(x: number, y: number, width: number, heading: string, lines: string[], rowSlots: number) {
    const PAD = 12
    const headingHeight = 13
    const lineHeight = 13
    const height = PAD * 2 + headingHeight + 4 + rowSlots * lineHeight
    doc.roundedRect(x, y, width, height, 4).fill(PANEL_BG)
    doc.font(boldFont).fontSize(9.5).fillColor(NAVY).text(heading, x + PAD, y + PAD, { width: width - PAD * 2, lineBreak: false })
    let ly = y + PAD + headingHeight + 4
    lines.forEach((line, i) => {
      doc.font(i === 0 ? boldFont : bodyFont).fontSize(9).fillColor(i === 0 ? TEXT : MUTED)
      doc.text(line, x + PAD, ly, { width: width - PAD * 2, lineBreak: false })
      ly += lineHeight
    })
    return height
  }

  const { order } = invoice
  const storeLines = [
    storeConfig.name,
    storeConfig.address && `Địa chỉ: ${storeConfig.address}`,
    storeConfig.hotline && `Điện thoại: ${storeConfig.hotline}`,
    storeConfig.website && `Website: ${storeConfig.website}`,
    `Nhân viên: ${order.nhanVien.hoTen}`,
  ].filter((l): l is string => Boolean(l))
  const customerLines = [
    order.khachHang.hoTen,
    `Điện thoại: ${order.khachHang.sdt}`,
    order.khachHang.email && `Email: ${order.khachHang.email}`,
  ].filter((l): l is string => Boolean(l))
  const rowSlots = Math.max(storeLines.length, customerLines.length)

  const panelGap = 16
  const panelWidth = (contentWidth - panelGap) / 2
  const panelY = headerBottom + 16
  const panelHeight = drawInfoPanel(PAGE_MARGIN, panelY, panelWidth, "THÔNG TIN CỬA HÀNG", storeLines, rowSlots)
  drawInfoPanel(PAGE_MARGIN + panelWidth + panelGap, panelY, panelWidth, "THÔNG TIN KHÁCH HÀNG", customerLines, rowSlots)

  // ─── Bảng sản phẩm ─────────────────────────────────────────────────────────
  const colSTT = { x: PAGE_MARGIN, w: 28 }
  const colProduct = { x: colSTT.x + colSTT.w, w: 253 }
  const colSL = { x: colProduct.x + colProduct.w, w: 34 }
  const colGia = { x: colSL.x + colSL.w, w: 95 }
  const colThanh = { x: colGia.x + colGia.w, w: rightEdge - (colGia.x + colGia.w) }

  const HEADER_ROW_HEIGHT = 22
  const ITEM_ROW_HEIGHT = 32
  const FOOTER_RESERVE = 140 // GHI CHÚ + tổng tiền + lời cảm ơn

  function drawTableHeader(y: number) {
    doc.rect(PAGE_MARGIN, y, contentWidth, HEADER_ROW_HEIGHT).fill(NAVY)
    doc.font(boldFont).fontSize(8.5).fillColor("white")
    const ty = y + 7
    doc.text("STT", colSTT.x, ty, { width: colSTT.w, align: "center" })
    doc.text("SẢN PHẨM", colProduct.x + 8, ty, { width: colProduct.w - 16 })
    doc.text("SL", colSL.x, ty, { width: colSL.w, align: "center" })
    doc.text("ĐƠN GIÁ", colGia.x, ty, { width: colGia.w - 8, align: "right" })
    doc.text("THÀNH TIỀN", colThanh.x, ty, { width: colThanh.w - 8, align: "right" })
    return y + HEADER_ROW_HEIGHT
  }

  let y = panelY + panelHeight + 20
  y = drawTableHeader(y)

  order.items.forEach((item, idx) => {
    if (y + ITEM_ROW_HEIGHT > doc.page.height - PAGE_MARGIN - FOOTER_RESERVE) {
      doc.addPage()
      y = PAGE_MARGIN
      y = drawTableHeader(y)
    }
    const rowTop = y
    const preOrderTag = item.product.loaiSanPham === "PRE_ORDER" ? "  ·  Pre-order" : ""
    doc.font(boldFont).fontSize(9.5).fillColor(TEXT).text(item.product.ten, colProduct.x + 8, rowTop + 6, { width: colProduct.w - 16, lineBreak: false })
    doc.font(bodyFont).fontSize(8).fillColor(MUTED).text(`Mã SP: ${item.product.sku}${preOrderTag}`, colProduct.x + 8, rowTop + 19, { width: colProduct.w - 16, lineBreak: false })
    doc.font(bodyFont).fontSize(9).fillColor(TEXT)
    doc.text(String(idx + 1), colSTT.x, rowTop + 11, { width: colSTT.w, align: "center" })
    doc.text(String(item.soLuong), colSL.x, rowTop + 11, { width: colSL.w, align: "center" })
    doc.text(formatMoney(item.donGia), colGia.x, rowTop + 11, { width: colGia.w - 8, align: "right" })
    doc.font(boldFont).text(formatMoney(item.thanhTien), colThanh.x, rowTop + 11, { width: colThanh.w - 8, align: "right" })
    doc.moveTo(PAGE_MARGIN, rowTop + ITEM_ROW_HEIGHT).lineTo(rightEdge, rowTop + ITEM_ROW_HEIGHT).lineWidth(0.5).strokeColor(BORDER).stroke()
    y = rowTop + ITEM_ROW_HEIGHT
  })

  if (y + FOOTER_RESERVE > doc.page.height - PAGE_MARGIN) {
    doc.addPage()
    y = PAGE_MARGIN
  }
  y += 18

  // ─── GHI CHÚ (trái) + tổng tiền (phải) ─────────────────────────────────────
  const notesWidth = (contentWidth - panelGap) / 2
  const totalsWidth = notesWidth
  const totalsX = PAGE_MARGIN + notesWidth + panelGap

  const notesText =
    order.ghiChu ?? "Cảm ơn quý khách đã mua hàng tại HDH Toys. Vui lòng lưu hóa đơn điện tử này để đối chiếu thông tin khi cần."
  doc.font(boldFont).fontSize(9.5).fillColor(NAVY).text("GHI CHÚ", PAGE_MARGIN, y, { lineBreak: false })
  doc.font(bodyFont).fontSize(8.5).fillColor(MUTED).text(notesText, PAGE_MARGIN, y + 15, { width: notesWidth })

  let ty = y
  const labelWidth = totalsWidth * 0.58
  function totalsRow(label: string, value: string, opts: { bold?: boolean; color?: string; divider?: boolean } = {}) {
    if (opts.divider) {
      ty += 3
      doc.moveTo(totalsX, ty).lineTo(totalsX + totalsWidth, ty).lineWidth(1).strokeColor(BORDER).stroke()
      ty += 8
    }
    const font = opts.bold ? boldFont : bodyFont
    const size = opts.bold ? 10.5 : 9.5
    doc.font(font).fontSize(size)
    const labelHeight = doc.heightOfString(label, { width: labelWidth })
    doc.fillColor(opts.color ?? (opts.bold ? TEXT : MUTED))
    doc.text(label, totalsX, ty, { width: labelWidth })
    doc.text(value, totalsX, ty, { width: totalsWidth, align: "right", lineBreak: false })
    ty += Math.max(labelHeight, size + 4) + (opts.bold ? 7 : 5)
  }

  totalsRow("Tạm tính", formatMoney(order.tamTinh))
  totalsRow("Giảm giá", order.giamGia > 0 ? `-${formatMoney(order.giamGia)}` : formatMoney(0))
  totalsRow("Phí vận chuyển", formatMoney(order.phiShip))
  totalsRow("Tổng cộng", formatMoney(order.tongCong), { bold: true, color: docAccent, divider: true })
  const nguon = order.preorder ? ` (${order.preorder.ma})` : ""
  totalsRow(`Tiền đã cọc${nguon}`, order.tienCoc > 0 ? `-${formatMoney(order.tienCoc)}` : formatMoney(0))
  totalsRow("THANH TOÁN CUỐI CÙNG", formatMoney(order.tongCong - order.tienCoc), { bold: true, color: docAccent, divider: true })

  const notesHeight = doc.font(bodyFont).fontSize(8.5).heightOfString(notesText, { width: notesWidth })
  y = Math.max(y + 15 + notesHeight, ty) + 20

  y += 12

  // ─── Kết nối với HDH Toys (QR Facebook/Zalo) ───────────────────────────────
  if (socialLinks.length > 0) {
    const qrSize = 72
    const blockHeight = 18 + 10 + qrSize + 14
    if (y + blockHeight > doc.page.height - PAGE_MARGIN) {
      doc.addPage()
      y = PAGE_MARGIN
    }
    doc.font(boldFont).fontSize(10).fillColor(NAVY).text("KẾT NỐI VỚI HDH TOYS", PAGE_MARGIN, y, { width: contentWidth, align: "center" })
    const gap = 40
    const totalWidth = socialLinks.length * qrSize + (socialLinks.length - 1) * gap
    let qx = PAGE_MARGIN + (contentWidth - totalWidth) / 2
    const qy = y + 18
    for (const social of socialLinks) {
      doc.image(social.qr, qx, qy, { width: qrSize, height: qrSize })
      doc.font(bodyFont).fontSize(8).fillColor(MUTED).text(social.label, qx - 15, qy + qrSize + 4, { width: qrSize + 30, align: "center", lineBreak: false })
      qx += qrSize + gap
    }
    y += blockHeight
  }

  // ─── Lời cảm ơn ─────────────────────────────────────────────────────────────
  doc.font(boldFont).fontSize(10).fillColor(NAVY).text("Cảm ơn quý khách đã tin tưởng HDH Toys!", PAGE_MARGIN, y, { width: contentWidth, align: "center" })
  doc.font(bodyFont).fontSize(8).fillColor(MUTED).text(
    invoice.provisional
      ? "Đây là phiếu tạm tính theo đơn hàng hiện tại (chưa Hoàn thành), có thể thay đổi và không phải hóa đơn chính thức."
      : "Hóa đơn này được tạo điện tử và có giá trị xác nhận thông tin mua hàng.",
    PAGE_MARGIN,
    y + 15,
    { width: contentWidth, align: "center" },
  )

  doc.end()
}
