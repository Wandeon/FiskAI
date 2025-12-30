-- AlterTable
ALTER TABLE "Company" ADD COLUMN "lastPaymentFailedAt" TIMESTAMP(3),
ADD COLUMN "paymentFailureCount" INTEGER NOT NULL DEFAULT 0;
