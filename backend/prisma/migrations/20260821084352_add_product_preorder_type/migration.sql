-- CreateEnum
CREATE TYPE "LoaiSanPham" AS ENUM ('CO_SAN', 'PRE_ORDER');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "loaiSanPham" "LoaiSanPham" NOT NULL DEFAULT 'CO_SAN',
ADD COLUMN     "ngayDuKienVe" TIMESTAMP(3),
ADD COLUMN     "nhacHang" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "products_loaiSanPham_idx" ON "products"("loaiSanPham");
