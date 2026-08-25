// Integration tests — these hit the REAL database configured via DATABASE_URL
// (backend/.env), not a mock. Every record created here is scoped to a unique
// RUN_ID and removed again in afterAll. Run only against a dev/staging database.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../lib/prisma.js"
import * as preordersService from "./preorders.service.js"
import * as ordersService from "./orders.service.js"

const RUN_ID = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe("preorders.service stock reservation (integration)", () => {
  let staffId: string
  let customerId: string
  const productIds: string[] = []
  const orderIds: string[] = []
  const preorderIds: string[] = []

  beforeAll(async () => {
    const staff = await prisma.staff.create({
      data: { hoTen: `${RUN_ID} Staff`, email: `${RUN_ID}@test.internal`, matKhauHash: "not-a-real-hash", vaiTro: "ADMIN" },
    })
    staffId = staff.id
    const customer = await prisma.customer.create({
      data: { hoTen: `${RUN_ID} Customer`, sdt: RUN_ID, nguonKhachHang: "KHAC" },
    })
    customerId = customer.id
  })

  afterAll(async () => {
    for (const id of preorderIds) await prisma.preorder.deleteMany({ where: { id } })
    for (const id of orderIds) {
      await prisma.invoice.deleteMany({ where: { orderId: id } })
      await prisma.order.deleteMany({ where: { id } }) // cascades OrderItem
    }
    for (const id of productIds) await prisma.product.delete({ where: { id } })
    await prisma.customer.delete({ where: { id: customerId } })
    await prisma.staff.delete({ where: { id: staffId } })
  })

  async function createProduct(tonKho: number) {
    const sku = `${RUN_ID}-${productIds.length}`
    const product = await prisma.product.create({
      data: { sku, ten: `${sku} Product`, danhMuc: "Test", nhaCungCap: "Test", giaVon: 100_000, giaBan: 300_000, tonKho },
    })
    productIds.push(product.id)
    return product.id
  }

  it("blocks a regular order from selling stock reserved by a Sẵn sàng giao preorder", async () => {
    const productId = await createProduct(5)
    const preorder = await preordersService.create({
      khachHangId: customerId,
      productId,
      soLuong: 5,
      donGiaDuKien: 300_000,
      tienCoc: 0,
      fallbackNhanVienId: staffId,
    })
    preorderIds.push(preorder.id)
    await prisma.preorder.update({ where: { id: preorder.id }, data: { trangThai: "SAN_SANG" } })

    // Tồn kho vật lý vẫn còn 5, nhưng cả 5 đã "giữ chỗ" cho preorder trên —
    // đơn hàng thường không được bán dù applyInventoryTransaction thấy tonKho vẫn đủ.
    await expect(
      ordersService.create({
        khachHangId: customerId,
        kenhBan: "TAI_CUA_HANG",
        phuongThucThanhToan: "TIEN_MAT",
        items: [{ productId, soLuong: 1, giamGia: 0 }],
        fallbackNhanVienId: staffId,
      }),
    ).rejects.toThrow(/khả dụng/)
  })

  it("still lets the reserved preorder itself convert into an order (excludes its own reservation)", async () => {
    const productId = await createProduct(5)
    const preorder = await preordersService.create({
      khachHangId: customerId,
      productId,
      soLuong: 5,
      donGiaDuKien: 300_000,
      tienCoc: 0,
      fallbackNhanVienId: staffId,
    })
    preorderIds.push(preorder.id)
    await prisma.preorder.update({ where: { id: preorder.id }, data: { trangThai: "SAN_SANG" } })

    const { order } = await preordersService.convertToOrder({
      id: preorder.id,
      phuongThucThanhToan: "TIEN_MAT",
      nguoiThucHienId: staffId,
    })
    orderIds.push(order.id)
    expect(order.tongCong).toBe(1_500_000)
  })

  it("allows a regular order for units NOT covered by the reservation", async () => {
    const productId = await createProduct(10)
    const preorder = await preordersService.create({
      khachHangId: customerId,
      productId,
      soLuong: 4,
      donGiaDuKien: 300_000,
      tienCoc: 0,
      fallbackNhanVienId: staffId,
    })
    preorderIds.push(preorder.id)
    await prisma.preorder.update({ where: { id: preorder.id }, data: { trangThai: "SAN_SANG" } })

    // 10 tồn kho - 4 giữ chỗ = 6 khả dụng, đủ cho đơn 6 cái
    const order = await ordersService.create({
      khachHangId: customerId,
      kenhBan: "TAI_CUA_HANG",
      phuongThucThanhToan: "TIEN_MAT",
      items: [{ productId, soLuong: 6, giamGia: 0 }],
      fallbackNhanVienId: staffId,
    })
    orderIds.push(order.id)
    expect(order.tongCong).toBe(1_800_000)
  })
})
