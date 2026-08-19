-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('PHAI_THU', 'PHAI_TRA');

-- CreateTable
CREATE TABLE "debts" (
    "id" TEXT NOT NULL,
    "doiTuong" TEXT NOT NULL,
    "loai" "DebtType" NOT NULL,
    "ngayPhatSinh" TIMESTAMP(3) NOT NULL,
    "ngayDenHan" TIMESTAMP(3) NOT NULL,
    "soTien" INTEGER NOT NULL,
    "daThanhToan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);
