-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BANK_STATEMENT', 'INVOICE', 'EXPENSE');

-- CreateEnum (if not exists)
DO $$ BEGIN
 CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterEnum
DO $$ BEGIN
 ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_REVIEW';
 ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
 ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "ImportJob" ALTER COLUMN "bankAccountId" DROP NOT NULL;
ALTER TABLE "ImportJob" ADD COLUMN "documentType" "DocumentType";
ALTER TABLE "ImportJob" ADD COLUMN "extractedData" JSONB;
