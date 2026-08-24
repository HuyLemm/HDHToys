import { describe, it, expect } from "vitest"
import { canTransition, formatOrderCode } from "./orderCode.js"

describe("canTransition", () => {
  it("allows the documented happy path: MOI -> DANG_XU_LY -> HOAN_THANH -> HOAN_TIEN", () => {
    expect(canTransition("MOI", "DANG_XU_LY")).toBe(true)
    expect(canTransition("DANG_XU_LY", "HOAN_THANH")).toBe(true)
    expect(canTransition("HOAN_THANH", "HOAN_TIEN")).toBe(true)
  })

  it("allows cancelling from MOI or DANG_XU_LY", () => {
    expect(canTransition("MOI", "DA_HUY")).toBe(true)
    expect(canTransition("DANG_XU_LY", "DA_HUY")).toBe(true)
  })

  it("never allows skipping straight from MOI to HOAN_THANH (that's a separate documented exception, not a normal transition)", () => {
    expect(canTransition("MOI", "HOAN_THANH")).toBe(false)
  })

  it("treats DA_HUY and HOAN_TIEN as terminal — no transitions out", () => {
    expect(canTransition("DA_HUY", "MOI")).toBe(false)
    expect(canTransition("DA_HUY", "DANG_XU_LY")).toBe(false)
    expect(canTransition("HOAN_TIEN", "HOAN_THANH")).toBe(false)
  })

  it("rejects an unknown source status", () => {
    expect(canTransition("NOT_A_REAL_STATUS", "MOI")).toBe(false)
  })
})

describe("formatOrderCode", () => {
  it("pads soThuTu to 5 digits and includes the year", () => {
    expect(formatOrderCode(7, new Date("2026-08-24"))).toBe("HDH-2026-00007")
    expect(formatOrderCode(12345, new Date("2026-08-24"))).toBe("HDH-2026-12345")
  })
})
