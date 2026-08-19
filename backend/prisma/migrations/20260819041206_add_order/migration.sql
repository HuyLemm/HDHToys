-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('MOI', 'DANG_XU_LY', 'HOAN_THANH', 'DA_HUY', 'HOAN_TIEN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TIEN_MAT', 'CHUYEN_KHOAN', 'THE', 'QR_CODE');

-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('TAI_CUA_HANG', 'DIEN_THOAI', 'FACEBOOK', 'KHAC');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "soThuTu" SERIAL NOT NULL,
    "ma" TEXT NOT NULL,
    "khachHangId" TEXT NOT NULL,
    "nhanVienId" TEXT NOT NULL,
    "kenhBan" "SalesChannel" NOT NULL DEFAULT 'TAI_CUA_HANG',
    "phuongThucThanhToan" "PaymentMethod" NOT NULL,
    "trangThai" "OrderStatus" NOT NULL DEFAULT 'MOI',
    "tamTinh" INTEGER NOT NULL,
    "giamGia" INTEGER NOT NULL DEFAULT 0,
    "vat" INTEGER NOT NULL DEFAULT 0,
    "tongCong" INTEGER NOT NULL,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "soLuong" INTEGER NOT NULL,
    "donGia" INTEGER NOT NULL,
    "giamGia" INTEGER NOT NULL DEFAULT 0,
    "thanhTien" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_soThuTu_key" ON "orders"("soThuTu");

-- CreateIndex
CREATE UNIQUE INDEX "orders_ma_key" ON "orders"("ma");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_khachHangId_fkey" FOREIGN KEY ("khachHangId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_nhanVienId_fkey" FOREIGN KEY ("nhanVienId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
