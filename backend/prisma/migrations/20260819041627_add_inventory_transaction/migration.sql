-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('NHAP', 'XUAT', 'DIEU_CHINH', 'TRA_HANG');

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "soThuTu" SERIAL NOT NULL,
    "maGiaoDich" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "loai" "InventoryTransactionType" NOT NULL,
    "soLuongThayDoi" INTEGER NOT NULL,
    "tonTruoc" INTEGER NOT NULL,
    "tonSau" INTEGER NOT NULL,
    "nguoiThucHienId" TEXT NOT NULL,
    "thamChieu" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transactions_soThuTu_key" ON "inventory_transactions"("soThuTu");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transactions_maGiaoDich_key" ON "inventory_transactions"("maGiaoDich");

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_nguoiThucHienId_fkey" FOREIGN KEY ("nguoiThucHienId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
