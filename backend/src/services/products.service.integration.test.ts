// Integration tests — these hit the REAL database configured via DATABASE_URL
// (backend/.env), not a mock. Every record created here is scoped to a unique
// RUN_ID and removed again in afterAll. Run only against a dev/staging database.
//
// NOTE: this dev environment now has real S3_* env vars configured (item 11 —
// Backblaze B2), so the Postgres-fallback test below temporarily clears them
// (restored in afterAll) to deterministically exercise that code path
// regardless of what's actually configured — lib/imageStorage.ts reads env
// vars per-call (not cached at module load) specifically to make this possible.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../lib/prisma.js"
import * as productsService from "./products.service.js"

const RUN_ID = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const S3_ENV_KEYS = ["S3_BUCKET", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const

// Ảnh PNG 1x1 hợp lệ tối thiểu (magic bytes thật) — file-type phải nhận ra image/png.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
)

describe("products.service image storage (integration)", () => {
  let productId: string
  let savedS3Env: Record<string, string | undefined> = {}

  beforeAll(async () => {
    const product = await prisma.product.create({
      data: { sku: RUN_ID, ten: `${RUN_ID} Product`, danhMuc: "Test", nhaCungCap: "Test", giaVon: 1000, giaBan: 2000 },
    })
    productId = product.id

    savedS3Env = Object.fromEntries(S3_ENV_KEYS.map((k) => [k, process.env[k]]))
    for (const k of S3_ENV_KEYS) delete process.env[k]
  })

  afterAll(async () => {
    for (const k of S3_ENV_KEYS) {
      if (savedS3Env[k] === undefined) delete process.env[k]
      else process.env[k] = savedS3Env[k]
    }
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
