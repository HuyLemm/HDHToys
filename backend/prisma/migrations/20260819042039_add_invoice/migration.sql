-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "soThuTu" SERIAL NOT NULL,
    "soHoaDon" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "nguoiTaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_soThuTu_key" ON "invoices"("soThuTu");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_soHoaDon_key" ON "invoices"("soHoaDon");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_nguoiTaoId_fkey" FOREIGN KEY ("nguoiTaoId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
