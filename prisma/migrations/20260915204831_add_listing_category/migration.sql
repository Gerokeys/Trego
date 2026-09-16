-- CreateEnum
CREATE TYPE "Category" AS ENUM ('PHONES', 'LAPTOPS', 'DESKTOPS', 'MONITORS', 'COMPONENTS', 'CAMERAS');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "category" "Category" NOT NULL DEFAULT 'PHONES';

-- CreateIndex
CREATE INDEX "listings_status_category_idx" ON "listings"("status", "category");
