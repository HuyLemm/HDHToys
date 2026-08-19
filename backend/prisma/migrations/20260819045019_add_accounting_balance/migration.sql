-- CreateTable
CREATE TABLE "accounting_balance" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "tienMat" INTEGER NOT NULL DEFAULT 0,
    "tienNganHang" INTEGER NOT NULL DEFAULT 0,
    "vonChuSoHuu" INTEGER NOT NULL DEFAULT 0,
    "taiSanKhac" INTEGER NOT NULL DEFAULT 0,
    "chiPhiChuaThanhToan" INTEGER NOT NULL DEFAULT 0,
    "khoanPhaiTraKhac" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_balance_pkey" PRIMARY KEY ("id")
);
