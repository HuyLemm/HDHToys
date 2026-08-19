-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('THU', 'CHI');

-- CreateEnum
CREATE TYPE "IncomeExpenseCategory" AS ENUM ('BAN_HANG', 'NHAP_HANG', 'VAN_CHUYEN', 'LUONG', 'DIEN_NUOC', 'MARKETING', 'KHAC');

-- CreateTable
CREATE TABLE "income_expenses" (
    "id" TEXT NOT NULL,
    "soThuTu" SERIAL NOT NULL,
    "maPhieu" TEXT NOT NULL,
    "loai" "TransactionKind" NOT NULL,
    "danhMuc" "IncomeExpenseCategory" NOT NULL,
    "noiDung" TEXT NOT NULL,
    "soTien" INTEGER NOT NULL,
    "nguoiTaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "income_expenses_soThuTu_key" ON "income_expenses"("soThuTu");

-- CreateIndex
CREATE UNIQUE INDEX "income_expenses_maPhieu_key" ON "income_expenses"("maPhieu");

-- AddForeignKey
ALTER TABLE "income_expenses" ADD CONSTRAINT "income_expenses_nguoiTaoId_fkey" FOREIGN KEY ("nguoiTaoId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
