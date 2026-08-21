-- CreateEnum
CREATE TYPE "PreorderStatus" AS ENUM ('CHO_HANG', 'SAN_SANG', 'DA_CHUYEN_DON', 'DA_HUY');

-- CreateTable
CREATE TABLE "preorders" (
    "id" TEXT NOT NULL,
    "soThuTu" SERIAL NOT NULL,
    "ma" TEXT NOT NULL,
    "khachHangId" TEXT NOT NULL,
    "nhanVienId" TEXT NOT NULL,
    "productId" TEXT,
    "tenSanPhamMoi" TEXT,
    "soLuong" INTEGER NOT NULL,
    "donGiaDuKien" INTEGER NOT NULL,
    "tienCoc" INTEGER NOT NULL DEFAULT 0,
    "trangThai" "PreorderStatus" NOT NULL DEFAULT 'CHO_HANG',
    "ngayDuKienCo" TIMESTAMP(3),
    "ghiChu" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preorders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preorders_soThuTu_key" ON "preorders"("soThuTu");

-- CreateIndex
CREATE UNIQUE INDEX "preorders_ma_key" ON "preorders"("ma");

-- CreateIndex
CREATE UNIQUE INDEX "preorders_orderId_key" ON "preorders"("orderId");

-- CreateIndex
CREATE INDEX "preorders_khachHangId_idx" ON "preorders"("khachHangId");

-- CreateIndex
CREATE INDEX "preorders_productId_idx" ON "preorders"("productId");

-- CreateIndex
CREATE INDEX "preorders_trangThai_idx" ON "preorders"("trangThai");

-- CreateIndex
CREATE INDEX "preorders_createdAt_idx" ON "preorders"("createdAt");

-- AddForeignKey
ALTER TABLE "preorders" ADD CONSTRAINT "preorders_khachHangId_fkey" FOREIGN KEY ("khachHangId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorders" ADD CONSTRAINT "preorders_nhanVienId_fkey" FOREIGN KEY ("nhanVienId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorders" ADD CONSTRAINT "preorders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorders" ADD CONSTRAINT "preorders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
