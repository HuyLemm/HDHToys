-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('CON_HANG', 'SAP_HET', 'HET_HANG', 'NGUNG_KINH_DOANH');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "barcode" TEXT,
    "danhMuc" TEXT NOT NULL,
    "nhaCungCap" TEXT NOT NULL,
    "anhUrl" TEXT,
    "giaVon" INTEGER NOT NULL,
    "giaBan" INTEGER NOT NULL,
    "tonKho" INTEGER NOT NULL DEFAULT 0,
    "tonKhoToiThieu" INTEGER NOT NULL DEFAULT 0,
    "daBan" INTEGER NOT NULL DEFAULT 0,
    "trangThai" "ProductStatus" NOT NULL DEFAULT 'CON_HANG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
