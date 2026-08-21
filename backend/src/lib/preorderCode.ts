export function formatPreorderCode(soThuTu: number, createdAt: Date) {
  return `PO-${createdAt.getFullYear()}-${String(soThuTu).padStart(5, "0")}`
}
