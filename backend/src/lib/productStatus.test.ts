import { describe, it, expect } from "vitest"
import { resolveStockStatus } from "./productStatus.js"

describe("resolveStockStatus", () => {
  it("is HET_HANG when stock is zero or negative", () => {
    expect(resolveStockStatus(0, 5, "CON_HANG")).toBe("HET_HANG")
    expect(resolveStockStatus(-1, 5, "CON_HANG")).toBe("HET_HANG")
  })

  it("is SAP_HET when stock is at or below the reorder threshold", () => {
    expect(resolveStockStatus(5, 5, "CON_HANG")).toBe("SAP_HET")
    expect(resolveStockStatus(1, 5, "CON_HANG")).toBe("SAP_HET")
  })

  it("is CON_HANG when stock is comfortably above the threshold", () => {
    expect(resolveStockStatus(10, 5, "CON_HANG")).toBe("CON_HANG")
  })

  it("never overrides NGUNG_KINH_DOANH regardless of stock level", () => {
    expect(resolveStockStatus(0, 5, "NGUNG_KINH_DOANH")).toBe("NGUNG_KINH_DOANH")
    expect(resolveStockStatus(100, 5, "NGUNG_KINH_DOANH")).toBe("NGUNG_KINH_DOANH")
  })
})
