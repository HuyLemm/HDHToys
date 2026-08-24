// Integration test against the real configured database — see the header
// comment in orders.service.integration.test.ts for the rationale/cleanup approach.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../lib/prisma.js"
import * as accountingService from "./accounting.service.js"

const RUN_ID = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe("accounting.service.getBalanceSheet retained-profit calculation (integration)", () => {
  let staffId: string
  const entryIds: string[] = []

  beforeAll(async () => {
    const staff = await prisma.staff.create({
      data: { hoTen: `${RUN_ID} Staff`, email: `${RUN_ID}@test.internal`, matKhauHash: "not-a-real-hash", vaiTro: "ADMIN" },
    })
    staffId = staff.id
  })

  afterAll(async () => {
    await prisma.incomeExpense.deleteMany({ where: { id: { in: entryIds } } })
    await prisma.staff.delete({ where: { id: staffId } })
  })

  it("moves loiNhuanGiuLai by exactly (THU - CHI) when a new ledger entry is recorded, instead of silently absorbing it as a plug", async () => {
    const before = await accountingService.getBalanceSheet()

    const thu = await prisma.incomeExpense.create({
      data: { maPhieu: `${RUN_ID}-THU`, loai: "THU", danhMuc: "KHAC", noiDung: `${RUN_ID} test thu`, soTien: 500_000, nguoiTaoId: staffId },
    })
    entryIds.push(thu.id)
    const chi = await prisma.incomeExpense.create({
      data: { maPhieu: `${RUN_ID}-CHI`, loai: "CHI", danhMuc: "KHAC", noiDung: `${RUN_ID} test chi`, soTien: 200_000, nguoiTaoId: staffId },
    })
    entryIds.push(chi.id)

    const after = await accountingService.getBalanceSheet()

    // Net effect of our 2 entries is +300k — the retained-profit figure (and
    // therefore tongVonChuSoHuu/tongNguonVon) must move by exactly that,
    // proving it's derived from the ledger and not just re-plugged to balance.
    expect(after.nguonVon.vonChuSoHuu.loiNhuanGiuLai - before.nguonVon.vonChuSoHuu.loiNhuanGiuLai).toBe(300_000)
    expect(after.nguonVon.tongNguonVon - before.nguonVon.tongNguonVon).toBe(300_000)
    // Assets (taiSan) are untouched by a THU/CHI entry with no matching change
    // to tienMat/tienNganHang/inventory — so the balance-sheet gap must widen
    // by the same 300k, which is exactly the point: it surfaces the real
    // mismatch instead of hiding it.
    expect(after.chenhLech - before.chenhLech).toBe(-300_000)
  })
})
