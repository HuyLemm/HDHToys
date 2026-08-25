-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "hoanTienAt" TIMESTAMP(3);

-- Backfill: đơn nào đã Hoàn tiền từ trước migration này chưa có hoanTienAt —
-- xấp xỉ bằng updatedAt (Prisma tự cập nhật cột này mỗi lần trangThai đổi,
-- nên đó chính là mốc lần cuối đơn được ghi lại, gần đúng nhất với lúc
-- chuyển sang Hoàn tiền mà không cần thêm dữ liệu lịch sử nào khác).
UPDATE "orders" SET "hoanTienAt" = "updatedAt" WHERE "trangThai" = 'HOAN_TIEN' AND "hoanTienAt" IS NULL;
