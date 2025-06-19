/*
  Warnings:

  - You are about to drop the column `residentialAddress` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `tradingAddress` on the `clients` table. All the data in the column will be lost.
  - Made the column `clientCode` on table `clients` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "clients" DROP COLUMN "residentialAddress",
DROP COLUMN "tradingAddress",
ADD COLUMN     "ltdCompanyAssignedUserId" TEXT,
ADD COLUMN     "natureOfBusiness" TEXT,
ADD COLUMN     "nonLtdCompanyAssignedUserId" TEXT,
ADD COLUMN     "registeredOfficeAddressCity" TEXT,
ADD COLUMN     "registeredOfficeAddressCountry" TEXT,
ADD COLUMN     "registeredOfficeAddressCounty" TEXT,
ADD COLUMN     "registeredOfficeAddressLine1" TEXT,
ADD COLUMN     "registeredOfficeAddressLine2" TEXT,
ADD COLUMN     "registeredOfficeAddressPostCode" TEXT,
ADD COLUMN     "vatAssignedUserId" TEXT,
ALTER COLUMN "clientCode" SET NOT NULL,
ALTER COLUMN "companyType" DROP NOT NULL,
ALTER COLUMN "corporationTaxStatus" SET DEFAULT 'UNKNOWN';

-- CreateIndex
CREATE INDEX "clients_ltdCompanyAssignedUserId_idx" ON "clients"("ltdCompanyAssignedUserId");

-- CreateIndex
CREATE INDEX "clients_nonLtdCompanyAssignedUserId_idx" ON "clients"("nonLtdCompanyAssignedUserId");

-- CreateIndex
CREATE INDEX "clients_vatAssignedUserId_idx" ON "clients"("vatAssignedUserId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_ltdCompanyAssignedUserId_fkey" FOREIGN KEY ("ltdCompanyAssignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_nonLtdCompanyAssignedUserId_fkey" FOREIGN KEY ("nonLtdCompanyAssignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_vatAssignedUserId_fkey" FOREIGN KEY ("vatAssignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
