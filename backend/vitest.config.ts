import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Integration test files all hit the same live dev DB (Neon) directly —
    // running them in parallel worker threads (Vitest's default) multiplies
    // concurrent connections/queries against one external, rate-limited
    // resource, causing intermittent 5s timeouts as more integration test
    // files were added over time (observed empirically, not a logic bug).
    // These tests are network-bound, not CPU-bound, so sequential file
    // execution costs some wall-clock time but eliminates that flakiness.
    fileParallelism: false,
    // Mặc định 10s cho hook (beforeAll/afterAll) đôi khi không đủ khi Neon có
    // độ trễ cold-start hoặc nhiều kết nối cùng lúc (đặc biệt beforeAll ở đây
    // tạo/hoàn thành nhiều đơn hàng liên tiếp, mỗi lượt là 1 network round-trip
    // riêng) — từng thấy "Hook timed out in 10000ms" dù không có lỗi logic gì.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
