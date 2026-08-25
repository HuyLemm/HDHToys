import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

/**
 * Lưu ảnh sản phẩm — mặc định vẫn lưu trực tiếp trong Postgres (ProductImage.data,
 * cách gốc, phù hợp quy mô nhỏ hiện tại — xem SDS mục "Ảnh sản phẩm lưu trong
 * Postgres"). Nếu đã cấu hình đủ 4 biến môi trường S3_* (S3-compatible: Cloudflare
 * R2, AWS S3, Backblaze B2...), tự động chuyển sang lưu ở object storage thay vì
 * Postgres — tránh phình kích thước DB khi số SKU có ảnh tăng lớn. Ảnh cũ đã lưu
 * kiểu Postgres (data != null) vẫn đọc được bình thường dù đã chuyển chế độ, vì
 * mỗi ảnh tự mang theo cách lưu của chính nó (storageKey != null hay không) —
 * không cần chạy migrate lại toàn bộ ảnh cũ khi bật S3.
 *
 * Đọc biến môi trường LÚC GỌI (không cache thành hằng số ở module scope) để
 * test có thể giả lập "chưa cấu hình S3" bằng cách xóa tạm `process.env.S3_*`
 * mà không cần mock cả module.
 */

function s3Config() {
  const bucket = process.env.S3_BUCKET
  const endpoint = process.env.S3_ENDPOINT
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
  const region = process.env.S3_REGION || "auto" // "auto" là giá trị hợp lệ cho Cloudflare R2
  return { bucket, endpoint, accessKeyId, secretAccessKey, region }
}

export function isS3Configured(): boolean {
  const { bucket, endpoint, accessKeyId, secretAccessKey } = s3Config()
  return Boolean(bucket && endpoint && accessKeyId && secretAccessKey)
}

function getClient(): S3Client {
  const { endpoint, accessKeyId, secretAccessKey, region } = s3Config()
  return new S3Client({ region, endpoint, credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! } })
}

function keyFor(productId: string) {
  return `product-images/${productId}`
}

/** Upload lên S3, trả về storageKey để lưu vào ProductImage.storageKey. Chỉ gọi khi isS3Configured(). */
export async function putImage(productId: string, data: Buffer, mimeType: string): Promise<string> {
  const storageKey = keyFor(productId)
  await getClient().send(
    new PutObjectCommand({ Bucket: s3Config().bucket!, Key: storageKey, Body: data, ContentType: mimeType }),
  )
  return storageKey
}

export async function getImageBuffer(storageKey: string): Promise<Buffer> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: s3Config().bucket!, Key: storageKey }))
  const bytes = await result.Body?.transformToByteArray()
  if (!bytes) throw new Error(`Không đọc được ảnh từ object storage (key: ${storageKey}).`)
  return Buffer.from(bytes)
}

export async function deleteImage(storageKey: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: s3Config().bucket!, Key: storageKey }))
}
