/**
 * Log tập trung, có cấu trúc (JSON 1 dòng) cho các sự kiện bảo mật bị từ
 * chối (auth/rate-limit/webhook) — hệ thống chưa có bảng audit log riêng
 * hay dashboard xem lại, nhưng in ra console theo một format nhất quán giúp
 * dò tìm mẫu tấn công qua log của nền tảng hosting (Render) thay vì chỉ có
 * các dòng lỗi rời rạc không định dạng.
 */
export function logSecurityEvent(event: string, details: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ level: "security", event, at: new Date().toISOString(), ...details }))
}
