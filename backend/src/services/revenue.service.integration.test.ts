// Integration tests against the real configured database — see the header
// comment in orders.service.integration.test.ts for the rationale/cleanup approach.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../lib/prisma.js"
import * as ordersService from "./orders.service.js"
import * as revenueService from "./revenue.service.js"

const RUN_ID = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe("revenue.service reports (integration)", () => {
  let staffId: string
  let customerAId: string
  let customerBId: string
  let productId: string
  const orderIds: string[] = []
  const rangeStart = new Date(Date.now() - 60_000)

  beforeAll(async () => {
    const staff = await prisma.staff.create({
      data: { hoTen: `${RUN_ID} Staff`, email: `${RUN_ID}@test.internal`, matKhauHash: "not-a-real-hash", vaiTro: "ADMIN" },
    })
    staffId = staff.id
    const customerA = await prisma.customer.create({ data: { hoTen: `${RUN_ID} A`, sdt: `${RUN_ID}-A`, nguonKhachHang: "KHAC" } })
    customerAId = customerA.id
    const customerB = await prisma.customer.create({ data: { hoTen: `${RUN_ID} B`, sdt: `${RUN_ID}-B`, nguonKhachHang: "KHAC" } })
    customerBId = customerB.id
    const product = await prisma.product.create({
      data: { sku: RUN_ID, ten: `${RUN_ID} Product`, danhMuc: `${RUN_ID}-Cat`, nhaCungCap: "Test", giaVon: 100_000, giaBan: 300_000, tonKho: 20 },
    })
    productId = product.id

    // Customer A buys twice (repeat customer), customer B buys once.
    for (const customerId of [customerAId, customerAId, customerBId]) {
      const order = await ordersService.create({
        khachHangId: customerId,
        kenhBan: "TAI_CUA_HANG",
        phuongThucThanhToan: "TIEN_MAT",
        items: [{ productId, soLuong: 2, giamGia: 0 }],
        fallbackNhanVienId: staffId,
      })
      orderIds.push(order.id)
      await ordersService.updateStatus({ orderId: order.id, trangThai: "DANG_XU_LY", nguoiThucHienId: staffId })
      await ordersService.updateStatus({ orderId: order.id, trangThai: "HOAN_THANH", nguoiThucHienId: staffId })
    }
  })

  afterAll(async () => {
    await prisma.incomeExpense.deleteMany({ where: { nguoiTaoId: staffId } })
    for (const id of orderIds) {
      await prisma.invoice.deleteMany({ where: { orderId: id } })
      await prisma.order.deleteMany({ where: { id } })
    }
    await prisma.product.delete({ where: { id: productId } })
    await prisma.customer.deleteMany({ where: { id: { in: [customerAId, customerBId] } } })
    await prisma.staff.delete({ where: { id: staffId } })
  })

  it("getByProduct includes giaVon and loiNhuan alongside doanhThu", async () => {
    const { items } = await revenueService.getByProduct(rangeStart, new Date())
    const row = items.find((i) => i.sku === RUN_ID)
    expect(row).toBeDefined()
    // 3 orders x 2 units x 300k giá bán = 1.8M doanh thu; giá vốn = 3 x 2 x 100k = 600k
    expect(row!.doanhThu).toBe(1_800_000)
    expect(row!.giaVon).toBe(600_000)
    expect(row!.loiNhuan).toBe(1_200_000)
  })

  it("getByCategory aggregates giaVon and loiNhuan for our test category", async () => {
    const { items } = await revenueService.getByCategory(rangeStart, new Date())
    const row = items.find((i) => i.danhMuc === `${RUN_ID}-Cat`)
    expect(row).toBeDefined()
    expect(row!.loiNhuan).toBe(row!.doanhThu - row!.giaVon)
    expect(row!.loiNhuan).toBe(1_200_000)
  })

  it("getInventoryTurnover reports units sold against current stock for our test product", async () => {
    const { items } = await revenueService.getInventoryTurnover(rangeStart, new Date())
    const row = items.find((i) => i.sku === RUN_ID)
    expect(row).toBeDefined()
    expect(row!.soLuongBan).toBe(6) // 3 orders x 2 units
    // Stock started at 20 and was decremented by the same 6 units at order
    // creation time (orders reserve stock immediately — see orders.service.ts#create).
    expect(row!.tonKho).toBe(14)
    expect(row!.vongQuay).toBeCloseTo(6 / 14, 2)
  })

  it("getRepeatCustomers identifies customer A (2 orders) as a repeat buyer, not customer B (1 order)", async () => {
    const result = await revenueService.getRepeatCustomers(rangeStart, new Date())
    const repeatA = result.items.find((c) => c.sdt === `${RUN_ID}-A`)
    const repeatB = result.items.find((c) => c.sdt === `${RUN_ID}-B`)
    expect(repeatA).toBeDefined()
    expect(repeatA!.soDon).toBe(2)
    expect(repeatB).toBeUndefined() // only 1 order — not a repeat buyer
  })
})
