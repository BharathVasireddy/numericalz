/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `newValues` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `oldValues` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resourceId` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the `verification_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "settings_key_idx";

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "ipAddress",
DROP COLUMN "metadata",
DROP COLUMN "newValues",
DROP COLUMN "oldValues",
DROP COLUMN "resource",
DROP COLUMN "resourceId",
DROP COLUMN "userAgent",
ADD COLUMN     "details" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "additionalComments" TEXT,
ADD COLUMN     "annualAccountingScheme" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "dormantStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flatRatePercentage" DOUBLE PRECISION,
ADD COLUMN     "jobCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jobCompletedDate" TIMESTAMP(3),
ADD COLUMN     "nationalInsuranceNumber" TEXT,
ADD COLUMN     "natureOfTrade" TEXT,
ADD COLUMN     "numberOfPartners" INTEGER,
ADD COLUMN     "paperWorkReceived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paperWorkReceivedDate" TIMESTAMP(3),
ADD COLUMN     "partnershipTaxReturn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousYearEnded" TIMESTAMP(3),
ADD COLUMN     "previousYearJobCompletedDate" TIMESTAMP(3),
ADD COLUMN     "previousYearSA100FiledDate" TIMESTAMP(3),
ADD COLUMN     "previousYearWorkReceivedDate" TIMESTAMP(3),
ADD COLUMN     "residentialAddressCountry" TEXT,
ADD COLUMN     "residentialAddressLine1" TEXT,
ADD COLUMN     "residentialAddressLine2" TEXT,
ADD COLUMN     "residentialAddressPostCode" TEXT,
ADD COLUMN     "sa100Filed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sa100FiledDate" TIMESTAMP(3),
ADD COLUMN     "smallCompanyExemption" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staff" TEXT,
ADD COLUMN     "tradingAddressCountry" TEXT,
ADD COLUMN     "tradingAddressLine1" TEXT,
ADD COLUMN     "tradingAddressLine2" TEXT,
ADD COLUMN     "tradingAddressPostCode" TEXT,
ADD COLUMN     "utrNumber" TEXT,
ADD COLUMN     "vatDeregistrationDate" TIMESTAMP(3),
ADD COLUMN     "vatFrequency" TEXT,
ADD COLUMN     "vatQuarters" TEXT,
ADD COLUMN     "vatRegistrationDate" TIMESTAMP(3),
ADD COLUMN     "vatScheme" TEXT,
ADD COLUMN     "workStatus" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "verification_tokens";

-- CreateTable
CREATE TABLE "verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");
