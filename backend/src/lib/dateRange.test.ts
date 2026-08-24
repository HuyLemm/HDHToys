import { describe, it, expect } from "vitest"
import { resolveDateRange } from "./dateRange.js"

describe("resolveDateRange", () => {
  it("hom_nay covers only today", () => {
    const { tuNgay, denNgay } = resolveDateRange("hom_nay")
    const now = new Date()
    expect(tuNgay.getDate()).toBe(now.getDate())
    expect(denNgay.getDate()).toBe(now.getDate())
    expect(tuNgay.getHours()).toBe(0)
    expect(denNgay.getHours()).toBe(23)
  })

  it("hom_qua covers exactly yesterday, not today", () => {
    const { tuNgay, denNgay } = resolveDateRange("hom_qua")
    const now = new Date()
    expect(tuNgay.getTime()).toBeLessThan(now.getTime())
    expect(denNgay.getDate()).toBe(tuNgay.getDate())
    expect(denNgay.getDate()).not.toBe(now.getDate())
  })

  it("7_ngay spans exactly 7 calendar days ending today", () => {
    const { tuNgay, denNgay } = resolveDateRange("7_ngay")
    const days = Math.round((denNgay.getTime() - tuNgay.getTime()) / 86_400_000)
    expect(days).toBe(7) // day -6 00:00:00 through day 0 23:59:59 = 7 calendar days
  })

  it("thang_nay starts on the 1st of the current month", () => {
    const { tuNgay } = resolveDateRange("thang_nay")
    expect(tuNgay.getDate()).toBe(1)
  })

  it("nam_nay starts on Jan 1st of the current year", () => {
    const { tuNgay } = resolveDateRange("nam_nay")
    expect(tuNgay.getMonth()).toBe(0)
    expect(tuNgay.getDate()).toBe(1)
  })

  it("tuy_chinh uses the provided custom range", () => {
    const tuNgay = new Date(2026, 0, 5)
    const denNgay = new Date(2026, 0, 10)
    const result = resolveDateRange("tuy_chinh", tuNgay, denNgay)
    expect(result.tuNgay.getDate()).toBe(5)
    expect(result.denNgay.getDate()).toBe(10)
  })

  it("tuy_chinh falls back to last 7 days when no custom range given", () => {
    const result = resolveDateRange("tuy_chinh")
    const now = new Date()
    expect(result.denNgay.getDate()).toBe(now.getDate())
  })
})
