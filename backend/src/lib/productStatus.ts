import type { ProductStatus } from "@prisma/client"

export function resolveStockStatus(
  tonKho: number,
  tonKhoToiThieu: number,
  currentStatus: ProductStatus,
): ProductStatus {
  if (currentStatus === "NGUNG_KINH_DOANH") return "NGUNG_KINH_DOANH"
  if (tonKho <= 0) return "HET_HANG"
  if (tonKho <= tonKhoToiThieu) return "SAP_HET"
  return "CON_HANG"
}
