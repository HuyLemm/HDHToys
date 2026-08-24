import { describe, it, expect } from "vitest"
import { formatInvoiceCode } from "./invoiceCode.js"

describe("formatInvoiceCode", () => {
  it("pads soThuTu to 5 digits and includes the year", () => {
    expect(formatInvoiceCode(7, new Date("2026-08-24"))).toBe("HDH-INV-2026-00007")
    expect(formatInvoiceCode(99999, new Date("2026-08-24"))).toBe("HDH-INV-2026-99999")
  })
})
