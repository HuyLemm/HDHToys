-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PREORDER_DEN_HAN');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "loai" "NotificationType" NOT NULL,
    "tieuDe" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "productId" TEXT,
    "ngayApDung" TIMESTAMP(3) NOT NULL,
    "daDoc" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_daDoc_idx" ON "notifications"("daDoc");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_productId_loai_ngayApDung_key" ON "notifications"("productId", "loai", "ngayApDung");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
