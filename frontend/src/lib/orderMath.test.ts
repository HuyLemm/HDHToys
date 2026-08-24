import { describe, it, expect } from "vitest"
import { computeOrderTotals } from "./orderMath.js"

describe("computeOrderTotals", () => {
  it("sums soLuong * giaBan across all lines for tamTinh", () => {
    const totals = computeOrderTotals(
      [
        { soLuong: 2, giaBan: 100_000, giamGia: 0 },
        { soLuong: 1, giaBan: 50_000, giamGia: 0 },
      ],
      0,
      false,
      0,
    )
    expect(totals.tamTinh).toBe(250_000)
  })

  it("subtracts per-line discounts from the total", () => {
    const totals = computeOrderTotals([{ soLuong: 1, giaBan: 100_000, giamGia: 20_000 }], 0, false, 0)
    expect(totals.giamGiaTong).toBe(20_000)
    expect(totals.tongCong).toBe(80_000)
  })

  it("adds the shipping fee only when isShip is true", () => {
    const line = [{ soLuong: 1, giaBan: 100_000, giamGia: 0 }]
    const shipped = computeOrderTotals(line, 20_000, true, 0)
    const pickedUp = computeOrderTotals(line, 20_000, false, 0)
    expect(shipped.phiShipApDung).toBe(20_000)
    expect(shipped.tongCong).toBe(120_000)
    expect(pickedUp.phiShipApDung).toBe(0)
    expect(pickedUp.tongCong).toBe(100_000)
  })

  it("subtracts the deposit to get the final payment due", () => {
    const totals = computeOrderTotals([{ soLuong: 1, giaBan: 300_000, giamGia: 0 }], 0, false, 50_000)
    expect(totals.thanhToanCuoiCung).toBe(250_000)
  })

  it("returns all zeros for an empty cart", () => {
    const totals = computeOrderTotals([], 0, false, 0)
    expect(totals).toEqual({ tamTinh: 0, giamGiaTong: 0, phiShipApDung: 0, tongCong: 0, thanhToanCuoiCung: 0 })
  })

  it("combines multiple lines, a discount, shipping, and a deposit consistently", () => {
    const totals = computeOrderTotals(
      [
        { soLuong: 2, giaBan: 250_000, giamGia: 20_000 },
        { soLuong: 1, giaBan: 350_000, giamGia: 0 },
      ],
      30_000,
      true,
      100_000,
    )
    // tamTinh = 2*250k + 1*350k = 850k; giamGia = 20k; +30k ship = 860k tongCong
    expect(totals.tamTinh).toBe(850_000)
    expect(totals.giamGiaTong).toBe(20_000)
    expect(totals.tongCong).toBe(860_000)
    expect(totals.thanhToanCuoiCung).toBe(760_000)
  })
})
