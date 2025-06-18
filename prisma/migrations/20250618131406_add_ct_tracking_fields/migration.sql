-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "corporationTaxPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "corporationTaxPeriodStart" TIMESTAMP(3),
ADD COLUMN     "corporationTaxStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "ctDueSource" TEXT DEFAULT 'AUTO',
ADD COLUMN     "ctStatusUpdatedBy" TEXT,
ADD COLUMN     "lastCTStatusUpdate" TIMESTAMP(3),
ADD COLUMN     "manualCTDueOverride" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "clients_corporationTaxStatus_idx" ON "clients"("corporationTaxStatus");

-- CreateIndex
CREATE INDEX "clients_corporationTaxPeriodEnd_idx" ON "clients"("corporationTaxPeriodEnd");

-- CreateIndex
CREATE INDEX "clients_ctDueSource_idx" ON "clients"("ctDueSource");
