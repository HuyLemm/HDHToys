-- AlterTable
ALTER TABLE "product_images" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "product_images" ADD COLUMN "storageKey" TEXT;
