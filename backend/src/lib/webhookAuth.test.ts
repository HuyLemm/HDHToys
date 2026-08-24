import { describe, it, expect, vi } from "vitest"

vi.mock("./paymentConfig.js", () => ({ webhookSecret: "real-secret-value" }))

const { verifyWebhookSecret } = await import("./webhookAuth.js")

describe("verifyWebhookSecret", () => {
  it("accepts the exact configured secret", () => {
    expect(verifyWebhookSecret("real-secret-value")).toBe(true)
  })

  it("rejects a wrong secret", () => {
    expect(verifyWebhookSecret("wrong-secret")).toBe(false)
  })

  it("rejects a secret of a different length without throwing", () => {
    expect(verifyWebhookSecret("short")).toBe(false)
    expect(verifyWebhookSecret("a-much-longer-string-than-the-real-secret")).toBe(false)
  })

  it("rejects when no secret is provided", () => {
    expect(verifyWebhookSecret(undefined)).toBe(false)
  })
})
