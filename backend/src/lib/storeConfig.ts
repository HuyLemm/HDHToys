import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Hotline/địa chỉ/website thật của cửa hàng chưa có — để trống (không in số
// điện thoại/địa chỉ bịa lên hóa đơn thật). Điền qua env khi có thông tin
// thật, không cần sửa code hay đợi deploy lại logic.
export const storeConfig = {
  name: "HDH TOYS",
  tagline: "Thế giới đồ chơi",
  hotline: process.env.STORE_HOTLINE ?? "",
  address: process.env.STORE_ADDRESS ?? "",
  website: process.env.STORE_WEBSITE ?? "",
  // QR kết nối mạng xã hội in ở cuối hóa đơn — bỏ trống thì không in QR đó.
  facebookUrl: process.env.STORE_FACEBOOK_URL ?? "",
  zaloUrl: process.env.STORE_ZALO_URL ?? "",
}

const LOGO_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "logo.jpg")

export function resolveLogoPath(): string | null {
  return existsSync(LOGO_PATH) ? LOGO_PATH : null
}
