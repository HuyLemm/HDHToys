-- CreateEnum
CREATE TYPE "PhuongThucNhanHang" AS ENUM ('KHACH_TOI_LAY', 'SHIP');

-- CreateEnum
CREATE TYPE "DonViVanChuyen" AS ENUM ('SPX', 'GRAB', 'KHAC');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "donViVanChuyen" "DonViVanChuyen",
ADD COLUMN     "phuongThucNhanHang" "PhuongThucNhanHang" NOT NULL DEFAULT 'KHACH_TOI_LAY';

-- CreateIndex
CREATE INDEX "orders_phuongThucNhanHang_idx" ON "orders"("phuongThucNhanHang");
