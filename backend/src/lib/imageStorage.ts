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
 */

const S3_BUCKET = process.env.S3_BUCKET
const S3_ENDPOINT = process.env.S3_ENDPOINT
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const S3_REGION = process.env.S3_REGION || "auto" // "auto" là giá trị hợp lệ cho Cloudflare R2

export const isS3Configured = Boolean(S3_BUCKET && S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)

let client: S3Client | null = null
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: { accessKeyId: S3_ACCESS_KEY_ID!, secretAccessKey: S3_SECRET_ACCESS_KEY! },
    })
  }
  return client
}

function keyFor(productId: string) {
  return `product-images/${productId}`
}

/** Upload lên S3, trả về storageKey để lưu vào ProductImage.storageKey. Chỉ gọi khi isS3Configured. */
export async function putImage(productId: string, data: Buffer, mimeType: string): Promise<string> {
  const storageKey = keyFor(productId)
  await getClient().send(
    new PutObjectCommand({ Bucket: S3_BUCKET!, Key: storageKey, Body: data, ContentType: mimeType }),
  )
  return storageKey
}

export async function getImageBuffer(storageKey: string): Promise<Buffer> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: S3_BUCKET!, Key: storageKey }))
  const bytes = await result.Body?.transformToByteArray()
  if (!bytes) throw new Error(`Không đọc được ảnh từ object storage (key: ${storageKey}).`)
  return Buffer.from(bytes)
}

export async function deleteImage(storageKey: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: S3_BUCKET!, Key: storageKey }))
}
