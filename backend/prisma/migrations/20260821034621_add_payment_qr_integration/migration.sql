-- CreateEnum
CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('KHOP', 'KHONG_KHOP', 'SAI_SO_TIEN');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "qrExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "soThuTu" SERIAL NOT NULL,
    "maGiaoDichNganHang" TEXT NOT NULL,
    "orderId" TEXT,
    "soTienNhan" INTEGER NOT NULL,
    "noiDungChuyenKhoan" TEXT NOT NULL,
    "trangThaiDoiSoat" "PaymentReconciliationStatus" NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_soThuTu_key" ON "payment_transactions"("soThuTu");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_maGiaoDichNganHang_key" ON "payment_transactions"("maGiaoDichNganHang");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
