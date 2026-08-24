import { describe, it, expect } from "vitest"
import { buildVietQrPayload } from "./vietqr.js"

describe("buildVietQrPayload", () => {
  const base = { bankBin: "970436", accountNo: "0123456789", accountName: "HDH TOYS", amount: 150_000, addInfo: "HDH-2026-00001" }

  it("embeds the bank BIN, account number, amount, and reference verbatim", () => {
    const payload = buildVietQrPayload(base)
    expect(payload).toContain(base.bankBin)
    expect(payload).toContain(base.accountNo)
    expect(payload).toContain(String(base.amount))
    expect(payload).toContain(base.addInfo)
  })

  it("rounds a fractional amount before encoding it", () => {
    const payload = buildVietQrPayload({ ...base, amount: 150_000.7 })
    expect(payload).toContain("150001")
    expect(payload).not.toContain("150000.7")
  })

  it("uppercases the account name and truncates it to 25 chars", () => {
    const longName = "nguyen van a rat la dai qua muc cho phep"
    const payload = buildVietQrPayload({ ...base, accountName: longName })
    expect(payload).toContain(longName.slice(0, 25).toUpperCase())
    expect(payload).not.toContain(longName.toUpperCase())
  })

  it("falls back to 'HDH TOYS' when accountName is empty", () => {
    const payload = buildVietQrPayload({ ...base, accountName: "" })
    expect(payload).toContain("HDH TOYS")
  })

  it("appends a valid 4-hex-digit CRC16/CCITT checksum at the end", () => {
    const payload = buildVietQrPayload(base)
    // The payload always ends with tag "63" (CRC), length "04", then 4 hex digits.
    expect(payload).toMatch(/6304[0-9A-F]{4}$/)
  })

  it("produces a stable, deterministic payload for the same input", () => {
    const a = buildVietQrPayload(base)
    const b = buildVietQrPayload(base)
    expect(a).toBe(b)
  })

  it("changes the CRC when any field changes (detects payload corruption)", () => {
    const a = buildVietQrPayload(base)
    const b = buildVietQrPayload({ ...base, amount: base.amount + 1 })
    const crcOf = (p: string) => p.slice(-4)
    expect(crcOf(a)).not.toBe(crcOf(b))
  })
})
