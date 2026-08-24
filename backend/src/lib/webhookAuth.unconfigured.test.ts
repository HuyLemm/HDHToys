import { describe, it, expect, vi } from "vitest"

vi.mock("./paymentConfig.js", () => ({ webhookSecret: "" }))

const { verifyWebhookSecret } = await import("./webhookAuth.js")

describe("verifyWebhookSecret when no secret is configured", () => {
  it("always rejects, even a would-be-correct empty secret, to fail closed", () => {
    expect(verifyWebhookSecret("")).toBe(false)
    expect(verifyWebhookSecret("anything")).toBe(false)
    expect(verifyWebhookSecret(undefined)).toBe(false)
  })
})
