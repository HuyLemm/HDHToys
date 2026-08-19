export function formatInvoiceCode(soThuTu: number, createdAt: Date) {
  return `HDH-INV-${createdAt.getFullYear()}-${String(soThuTu).padStart(5, "0")}`
}
