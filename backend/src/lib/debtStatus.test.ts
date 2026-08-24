import { describe, it, expect } from "vitest"
import { resolveDebtStatus, serializeDebt } from "./debtStatus.js"

const DAY_MS = 86_400_000

describe("resolveDebtStatus", () => {
  const now = new Date("2026-08-24T00:00:00Z")

  it("is DA_THANH_TOAN once fully paid, regardless of due date", () => {
    expect(resolveDebtStatus(0, new Date(now.getTime() - DAY_MS), now)).toBe("DA_THANH_TOAN")
    expect(resolveDebtStatus(-500, new Date(now.getTime() + DAY_MS), now)).toBe("DA_THANH_TOAN")
  })

  it("is QUA_HAN once the due date has passed with balance remaining", () => {
    expect(resolveDebtStatus(1000, new Date(now.getTime() - DAY_MS), now)).toBe("QUA_HAN")
  })

  it("is SAP_DEN_HAN within the 7-day warning window", () => {
    expect(resolveDebtStatus(1000, new Date(now.getTime() + 3 * DAY_MS), now)).toBe("SAP_DEN_HAN")
    expect(resolveDebtStatus(1000, new Date(now.getTime() + 7 * DAY_MS), now)).toBe("SAP_DEN_HAN")
  })

  it("is CHUA_DEN_HAN when due date is further than 7 days away", () => {
    expect(resolveDebtStatus(1000, new Date(now.getTime() + 8 * DAY_MS), now)).toBe("CHUA_DEN_HAN")
  })
})

describe("serializeDebt", () => {
  it("computes conLai and derives trangThai from it", () => {
    const debt = { soTien: 1_000_000, daThanhToan: 400_000, ngayDenHan: new Date("2026-09-01") }
    const result = serializeDebt(debt)
    expect(result.conLai).toBe(600_000)
    expect(result.trangThai).toBeDefined()
  })

  it("treats an overpaid debt (daThanhToan > soTien) as fully paid", () => {
    const debt = { soTien: 100_000, daThanhToan: 150_000, ngayDenHan: new Date("2020-01-01") }
    const result = serializeDebt(debt)
    expect(result.conLai).toBe(-50_000)
    expect(result.trangThai).toBe("DA_THANH_TOAN")
  })
})
