-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "nextCorporationTaxDue" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "clients_nextCorporationTaxDue_idx" ON "clients"("nextCorporationTaxDue");
