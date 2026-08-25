import { prisma } from "./prisma.js"

/**
 * Log tập trung, có cấu trúc cho các sự kiện bảo mật bị từ chối
 * (auth/rate-limit/webhook). Vừa in ra console (JSON 1 dòng, dò được qua log
 * của nền tảng hosting) vừa ghi vào bảng `SecurityLog` để Admin xem lại được
 * ngay trong app (Cài đặt → Nhật ký bảo mật — xem services/securityLog.service.ts)
 * thay vì phải vào Render mới xem được.
 *
 * Ghi DB là fire-and-forget (không `await`, nuốt lỗi) — đây là log phụ trợ,
 * không được phép làm chậm hoặc làm hỏng phản hồi 401/403/429 gốc nếu bản
 * thân việc ghi log thất bại (ví dụ DB tạm thời không kết nối được).
 */
export function logSecurityEvent(event: string, details: Record<string, unknown> = {}) {
  const at = new Date().toISOString()
  console.warn(JSON.stringify({ level: "security", event, at, ...details }))

  // JSON.parse(JSON.stringify(...)) làm sạch các giá trị `undefined` (ví dụ
  // staffId khi req.auth chưa có) — Prisma Json field không nhận undefined.
  const detail = JSON.parse(JSON.stringify(details))
  prisma.securityLog.create({ data: { event, detail } }).catch(() => {})
}
