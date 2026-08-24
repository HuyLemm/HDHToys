// Integration tests — these hit the REAL database configured via DATABASE_URL
// (backend/.env), not a mock. There is no separate test database for this
// project yet, so every record created here is scoped to a unique RUN_ID and
// removed again in afterAll. Run only against a dev/staging database, never
// against production data.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../lib/prisma.js"
import * as ordersService from "./orders.service.js"

const RUN_ID = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe("orders.service order lifecycle (integration)", () => {
  let staffId: string
  let customerId: string
  let productId: string
  const orderIds: string[] = []

  beforeAll(async () => {
    const staff = await prisma.staff.create({
      data: { hoTen: `${RUN_ID} Staff`, email: `${RUN_ID}@test.internal`, matKhauHash: "not-a-real-hash", vaiTro: "ADMIN" },
    })
    staffId = staff.id
    const customer = await prisma.customer.create({
      data: { hoTen: `${RUN_ID} Customer`, sdt: RUN_ID, nguonKhachHang: "KHAC" },
    })
    customerId = customer.id
    const product = await prisma.product.create({
      data: { sku: RUN_ID, ten: `${RUN_ID} Product`, danhMuc: "Test", nhaCungCap: "Test", giaVon: 100_000, giaBan: 300_000, tonKho: 1000 },
    })
    productId = product.id
  })

  afterAll(async () => {
    await prisma.incomeExpense.deleteMany({ where: { nguoiTaoId: staffId } })
    for (const id of orderIds) {
      await prisma.invoice.deleteMany({ where: { orderId: id } })
      await prisma.order.deleteMany({ where: { id } }) // cascades OrderItem
    }
    await prisma.product.delete({ where: { id: productId } })
    await prisma.customer.delete({ where: { id: customerId } })
    await prisma.staff.delete({ where: { id: staffId } })
  })

  it("rejects a shipping fee on a non-Ship order", async () => {
    await expect(
      ordersService.create({
        khachHangId: customerId,
        kenhBan: "TAI_CUA_HANG",
        phuongThucThanhToan: "TIEN_MAT",
        phiShip: 10_000,
        items: [{ productId, soLuong: 1, giamGia: 0 }],
        fallbackNhanVienId: staffId,
      }),
    ).rejects.toThrow()
  })

  it("adds the shipping fee to tongCong for a Ship order", async () => {
    const order = await ordersService.create({
      khachHangId: customerId,
      kenhBan: "TAI_CUA_HANG",
      phuongThucThanhToan: "TIEN_MAT",
      phuongThucNhanHang: "SHIP",
      donViVanChuyen: "SPX",
      phiShip: 20_000,
      items: [{ productId, soLuong: 1, giamGia: 0 }],
      fallbackNhanVienId: staffId,
    })
    orderIds.push(order.id)
    expect(order.tongCong).toBe(320_000) // 300k giá bán + 20k phí ship
  })

  it("books THU/CHI on completion whose net equals the order's gross margin", async () => {
    const order = await ordersService.create({
      khachHangId: customerId,
      kenhBan: "TAI_CUA_HANG",
      phuongThucThanhToan: "TIEN_MAT",
      tienCoc: 50_000,
      items: [{ productId, soLuong: 2, giamGia: 0 }],
      fallbackNhanVienId: staffId,
    })
    orderIds.push(order.id)
    await ordersService.updateStatus({ orderId: order.id, trangThai: "DANG_XU_LY", nguoiThucHienId: staffId })
    await ordersService.updateStatus({ orderId: order.id, trangThai: "HOAN_THANH", nguoiThucHienId: staffId })

    const entries = await prisma.incomeExpense.findMany({ where: { noiDung: { contains: order.ma } } })
    const thu = entries.filter((e) => e.loai === "THU").reduce((s, e) => s + e.soTien, 0)
    const chi = entries.filter((e) => e.loai === "CHI").reduce((s, e) => s + e.soTien, 0)
    expect(thu - chi).toBe(order.tongCong - 2 * 100_000)
  })

  it("fully reverses the ledger to net zero — including the deposit — when a completed order is refunded", async () => {
    const order = await ordersService.create({
      khachHangId: customerId,
      kenhBan: "TAI_CUA_HANG",
      phuongThucThanhToan: "TIEN_MAT",
      tienCoc: 30_000,
      items: [{ productId, soLuong: 1, giamGia: 0 }],
      fallbackNhanVienId: staffId,
    })
    orderIds.push(order.id)
    await ordersService.updateStatus({ orderId: order.id, trangThai: "DANG_XU_LY", nguoiThucHienId: staffId })
    await ordersService.updateStatus({ orderId: order.id, trangThai: "HOAN_THANH", nguoiThucHienId: staffId })
    await ordersService.updateStatus({ orderId: order.id, trangThai: "HOAN_TIEN", nguoiThucHienId: staffId })

    const entries = await prisma.incomeExpense.findMany({ where: { noiDung: { contains: order.ma } } })
    const net = entries.reduce((s, e) => s + (e.loai === "THU" ? e.soTien : -e.soTien), 0)
    expect(net).toBe(0)
  })

  it("locks the shipping fee once the order has completed", async () => {
    const order = await ordersService.create({
      khachHangId: customerId,
      kenhBan: "TAI_CUA_HANG",
      phuongThucThanhToan: "TIEN_MAT",
      phuongThucNhanHang: "SHIP",
      donViVanChuyen: "SPX",
      phiShip: 15_000,
      items: [{ productId, soLuong: 1, giamGia: 0 }],
      fallbackNhanVienId: staffId,
    })
    orderIds.push(order.id)
    await ordersService.updateStatus({ orderId: order.id, trangThai: "DANG_XU_LY", nguoiThucHienId: staffId })
    await ordersService.updateStatus({ orderId: order.id, trangThai: "HOAN_THANH", nguoiThucHienId: staffId })

    await expect(ordersService.updateShippingFee(order.id, 99_999)).rejects.toThrow()
  })

  it("lets a customer deposit after order creation, booking the increase as THU", async () => {
    const order = await ordersService.create({
      khachHangId: customerId,
      kenhBan: "TAI_CUA_HANG",
      phuongThucThanhToan: "TIEN_MAT",
      items: [{ productId, soLuong: 1, giamGia: 0 }],
      fallbackNhanVienId: staffId,
    })
    orderIds.push(order.id)
    expect(order.tienCoc).toBe(0)

    const updated = await ordersService.updateDeposit(order.id, 40_000, staffId)
    expect(updated.tienCoc).toBe(40_000)

    const entries = await prisma.incomeExpense.findMany({ where: { noiDung: { contains: order.ma }, loai: "THU" } })
    expect(entries.reduce((s, e) => s + e.soTien, 0)).toBe(40_000)
  })

  it("books a CHI when the deposit is corrected downward", async () => {
    const order = await ordersService.create({
      khachHangId: customerId,
      kenhBan: "TAI_CUA_HANG",
      phuongThucThanhToan: "TIEN_MAT",
      tienCoc: 60_000,
      items: [{ productId, soLuong: 1, giamGia: 0 }],
      fallbackNhanVienId: staffId,
    })
    orderIds.push(order.id)

    const updated = await ordersService.updateDeposit(order.id, 25_000, staffId)
    expect(updated.tienCoc).toBe(25_000)

    const entries = await prisma.incomeExpense.findMany({ where: { noiDung: { contains: order.ma } } })
    const net = entries.reduce((s, e) => s + (e.loai === "THU" ? e.soTien : -e.soTien), 0)
    expect(net).toBe(25_000) // 60k cọc ban đầu - 35k hoàn lại phần chênh lệch
  })

  it("locks the deposit once the order has completed", async () => {
    const order = await ordersService.create({
      khachHangId: customerId,
      kenhBan: "TAI_CUA_HANG",
      phuongThucThanhToan: "TIEN_MAT",
      items: [{ productId, soLuong: 1, giamGia: 0 }],
      fallbackNhanVienId: staffId,
    })
    orderIds.push(order.id)
    await ordersService.updateStatus({ orderId: order.id, trangThai: "DANG_XU_LY", nguoiThucHienId: staffId })
    await ordersService.updateStatus({ orderId: order.id, trangThai: "HOAN_THANH", nguoiThucHienId: staffId })

    await expect(ordersService.updateDeposit(order.id, 50_000, staffId)).rejects.toThrow()
  })

  it("rejects a per-item discount larger than that line's own total (no free-via-discount loophole)", async () => {
    await expect(
      ordersService.create({
        khachHangId: customerId,
        kenhBan: "TAI_CUA_HANG",
        phuongThucThanhToan: "TIEN_MAT",
        items: [{ productId, soLuong: 1, giamGia: 999_999_999 }],
        fallbackNhanVienId: staffId,
      }),
    ).rejects.toThrow()
  })

  it("rejects a deposit larger than the order total", async () => {
    await expect(
      ordersService.create({
        khachHangId: customerId,
        kenhBan: "TAI_CUA_HANG",
        phuongThucThanhToan: "TIEN_MAT",
        tienCoc: 999_999_999,
        items: [{ productId, soLuong: 1, giamGia: 0 }],
        fallbackNhanVienId: staffId,
      }),
    ).rejects.toThrow()
  })
})
