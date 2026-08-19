-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('NEW', 'MEMBER', 'VIP');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "sdt" TEXT NOT NULL,
    "email" TEXT,
    "ngaySinh" TIMESTAMP(3),
    "hangKhachHang" "CustomerTier" NOT NULL DEFAULT 'NEW',
    "diemTichLuy" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "nguoiTaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_sdt_key" ON "customers"("sdt");

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
