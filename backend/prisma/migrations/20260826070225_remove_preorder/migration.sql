/*
  Warnings:

  - You are about to drop the `preorders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "preorders" DROP CONSTRAINT "preorders_khachHangId_fkey";

-- DropForeignKey
ALTER TABLE "preorders" DROP CONSTRAINT "preorders_nhanVienId_fkey";

-- DropForeignKey
ALTER TABLE "preorders" DROP CONSTRAINT "preorders_orderId_fkey";

-- DropForeignKey
ALTER TABLE "preorders" DROP CONSTRAINT "preorders_productId_fkey";

-- DropTable
DROP TABLE "preorders";

-- DropEnum
DROP TYPE "PreorderStatus";
