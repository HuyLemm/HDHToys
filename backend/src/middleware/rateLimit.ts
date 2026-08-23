import rateLimit from "express-rate-limit"

/**
 * Chặn brute-force mật khẩu ở /auth/login — giới hạn theo IP. Nhiều nhân
 * viên một cửa hàng thường dùng chung 1 IP (NAT/router chung), nên ngưỡng
 * để đủ rộng cho gõ nhầm bình thường nhưng vẫn chặn được dò mật khẩu tự động.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút." },
})

/**
 * Giới hạn chung cho toàn bộ API — phòng chống cào dữ liệu/DoS đơn giản.
 * Ngưỡng đặt rộng vì 1 màn Dashboard load ~10 request cùng lúc, và polling
 * QR (mục 5.8 SDS) gọi lại mỗi 4s khi có đơn đang mở — không nên chặn dùng
 * bình thường.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
})
