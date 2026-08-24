// Integration tests — these hit the REAL database configured via DATABASE_URL
// (backend/.env), not a mock. Every record created here is scoped to a unique
// RUN_ID and removed again in afterAll. Run only against a dev/staging database.
import { describe, it, expect, afterAll } from "vitest"
import { prisma } from "../lib/prisma.js"
import * as customersService from "./customers.service.js"

const RUN_ID = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const customerIds: string[] = []

afterAll(async () => {
  for (const id of customerIds) await prisma.customer.delete({ where: { id } })
})

describe("customers.service.update — clearing optional fields (integration)", () => {
  it("clears an optional field when the caller passes null, but leaves it untouched when the field is omitted", async () => {
    const created = await customersService.create({
      hoTen: `${RUN_ID} Customer`,
      sdt: RUN_ID,
      email: `${RUN_ID}@test.internal`,
      diaChi: "123 Test Street",
      nguonKhachHang: "KHAC",
      hangKhachHang: "NEW",
    })
    customerIds.push(created.id)
    expect(created.email).toBe(`${RUN_ID}@test.internal`)

    // Omitting diaChi entirely (not passing the key at all) must NOT touch it —
    // this mirrors what a client sends when a field is simply not part of the edit.
    const afterEmailClear = await customersService.update(created.id, { email: null })
    expect(afterEmailClear.email).toBeNull()
    expect(afterEmailClear.diaChi).toBe("123 Test Street")

    const afterAddressClear = await customersService.update(created.id, { diaChi: null })
    expect(afterAddressClear.diaChi).toBeNull()
  })
})
