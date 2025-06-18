-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "isVatEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextVatReturnDue" TIMESTAMP(3),
ADD COLUMN     "preferredContactMethod" TEXT,
ADD COLUMN     "requiresBookkeeping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresManagementAccounts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresPayroll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "vatReturnsFrequency" TEXT;
