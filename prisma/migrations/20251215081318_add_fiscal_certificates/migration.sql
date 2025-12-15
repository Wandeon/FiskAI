-- CreateEnum
CREATE TYPE "FiscalEnv" AS ENUM ('TEST', 'PROD');

-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "FiscalStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "FiscalMessageType" AS ENUM ('RACUN', 'STORNO', 'PROVJERA');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "deviceCode" TEXT NOT NULL DEFAULT '1',
ADD COLUMN     "fiscalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fiscalEnvironment" "FiscalEnv" NOT NULL DEFAULT 'PROD',
ADD COLUMN     "premisesCode" TEXT NOT NULL DEFAULT '1';

-- AlterTable
ALTER TABLE "EInvoice" ADD COLUMN     "fiscalStatus" TEXT,
ADD COLUMN     "operatorOib" TEXT;

-- CreateTable
CREATE TABLE "FiscalCertificate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "environment" "FiscalEnv" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'DIRECT',
    "certSubject" TEXT NOT NULL,
    "certSerial" TEXT NOT NULL,
    "certNotBefore" TIMESTAMP(3) NOT NULL,
    "certNotAfter" TIMESTAMP(3) NOT NULL,
    "oibExtracted" TEXT NOT NULL,
    "certSha256" TEXT NOT NULL,
    "encryptedP12" TEXT NOT NULL,
    "encryptedDataKey" TEXT NOT NULL,
    "status" "CertStatus" NOT NULL DEFAULT 'PENDING',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "messageType" "FiscalMessageType" NOT NULL,
    "status" "FiscalStatus" NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "jir" TEXT,
    "zki" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "lastHttpStatus" INTEGER,
    "requestXml" TEXT,
    "signedXml" TEXT,
    "responseXml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiscalCertificate_companyId_idx" ON "FiscalCertificate"("companyId");

-- CreateIndex
CREATE INDEX "FiscalCertificate_status_idx" ON "FiscalCertificate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalCertificate_companyId_environment_key" ON "FiscalCertificate"("companyId", "environment");

-- CreateIndex
CREATE INDEX "FiscalRequest_status_nextRetryAt_idx" ON "FiscalRequest"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "FiscalRequest_companyId_idx" ON "FiscalRequest"("companyId");

-- CreateIndex
CREATE INDEX "FiscalRequest_invoiceId_idx" ON "FiscalRequest"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalRequest_companyId_invoiceId_messageType_key" ON "FiscalRequest"("companyId", "invoiceId", "messageType");

-- AddForeignKey
ALTER TABLE "FiscalCertificate" ADD CONSTRAINT "FiscalCertificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalRequest" ADD CONSTRAINT "FiscalRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalRequest" ADD CONSTRAINT "FiscalRequest_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "FiscalCertificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalRequest" ADD CONSTRAINT "FiscalRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "EInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
