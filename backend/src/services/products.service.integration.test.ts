// Integration tests — these hit the REAL database configured via DATABASE_URL
// (backend/.env), not a mock. Every record created here is scoped to a unique
// RUN_ID and removed again in afterAll. Run only against a dev/staging database.
//
// NOTE: only exercises the Postgres-fallback image storage path (no S3_* env
// vars configured in this dev environment) — the S3-compatible path in
// lib/imageStorage.ts can't be exercised here without real bucket credentials.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../lib/prisma.js"
import * as productsService from "./products.service.js"

const RUN_ID = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// Ảnh PNG 1x1 hợp lệ tối thiểu (magic bytes thật) — file-type phải nhận ra image/png.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
)

describe("products.service image storage (integration)", () => {
  let productId: string

  beforeAll(async () => {
    const product = await prisma.product.create({
      data: { sku: RUN_ID, ten: `${RUN_ID} Product`, danhMuc: "Test", nhaCungCap: "Test", giaVon: 1000, giaBan: 2000 },
    })
    productId = product.id
  })

  afterAll(async () => {
    await prisma.productImage.deleteMany({ where: { productId } })
    await prisma.product.delete({ where: { id: productId } })
  })

  it("uploads, reads back, and deletes an image via the Postgres fallback path", async () => {
    await productsService.uploadImage(productId, TINY_PNG, "image/png")

    const image = await productsService.getImage(productId)
    expect(image.mimeType).toBe("image/png")
    expect(Buffer.compare(image.data, TINY_PNG)).toBe(0)

    const row = await prisma.productImage.findUnique({ where: { productId } })
    expect(row?.storageKey).toBeNull()
    expect(row?.data).not.toBeNull()

    await productsService.deleteImage(productId)
    await expect(productsService.getImage(productId)).rejects.toThrow()
  })

  it("rejects a file whose content doesn't match a real image format", async () => {
    const fakeImage = Buffer.from("<html>not an image</html>")
    await expect(productsService.uploadImage(productId, fakeImage, "image/png")).rejects.toThrow()
  })
})
