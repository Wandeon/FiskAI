-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('VAT_SUMMARY', 'PROFIT_LOSS', 'REVENUE_BY_CUSTOMER', 'EXPENSES_BY_CATEGORY', 'RECEIVABLES_AGING', 'PAYABLES_AGING', 'CASH_FLOW');

-- CreateEnum
CREATE TYPE "ReportSchedule" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "filters" JSONB NOT NULL,
    "schedule" "ReportSchedule" NOT NULL DEFAULT 'NONE',
    "emailTo" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedReport_companyId_idx" ON "SavedReport"("companyId");
CREATE INDEX "SavedReport_type_idx" ON "SavedReport"("type");

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
