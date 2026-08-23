// Cấu hình cho tích hợp thanh toán QR ngân hàng (SRS mục 3.16 / SDS mục 4.14, 5.8).
// Đọc lười (không throw khi thiếu, khác với JWT_SECRET) vì tính năng này là
// mở rộng tùy chọn — môi trường chưa cấu hình vẫn chạy được các chức năng khác.

export const PAYMENT_SYSTEM_STAFF_EMAIL = "system@hdhtoys.internal"

export const vietQrConfig = {
  bankBin: process.env.VIETQR_BANK_BIN ?? "",
  accountNo: process.env.VIETQR_ACCOUNT_NO ?? "",
  accountName: process.env.VIETQR_ACCOUNT_NAME ?? "HDH TOYS",
  ttlMinutes: Number(process.env.VIETQR_TTL_MINUTES ?? 15),
}

export function isVietQrConfigured(): boolean {
  return Boolean(vietQrConfig.bankBin && vietQrConfig.accountNo)
}

export const webhookSecret = process.env.VIETQR_WEBHOOK_SECRET ?? ""

// Lớp phòng thủ thứ 2 cho webhook (bên cạnh shared secret) — để trống thì bỏ
// qua kiểm tra IP (mặc định, vì chưa chắc biết dải IP cố định của dịch vụ đối
// soát thật sẽ dùng). Điền vào khi đã chọn được provider thật và họ công bố
// dải IP cố định, phân tách bằng dấu phẩy.
export const webhookAllowedIps = (process.env.VIETQR_WEBHOOK_ALLOWED_IPS ?? "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean)
