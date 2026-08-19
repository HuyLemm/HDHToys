-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'MANAGER', 'ACCOUNTANT', 'INVENTORY_STAFF');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "matKhauHash" TEXT NOT NULL,
    "vaiTro" "StaffRole" NOT NULL,
    "trangThai" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");
