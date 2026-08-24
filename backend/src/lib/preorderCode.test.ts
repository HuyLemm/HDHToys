import { describe, it, expect } from "vitest"
import { formatPreorderCode } from "./preorderCode.js"

describe("formatPreorderCode", () => {
  it("pads soThuTu to 5 digits and includes the year", () => {
    expect(formatPreorderCode(7, new Date("2026-08-24"))).toBe("PO-2026-00007")
  })
})
