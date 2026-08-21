-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "daThanhToan" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "orders_daThanhToan_idx" ON "orders"("daThanhToan");
