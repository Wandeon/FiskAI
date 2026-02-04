-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "eInvoiceApiKeyEncrypted" TEXT,
ADD COLUMN     "eInvoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eInvoiceProvider" TEXT;

-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'C62',
ADD COLUMN     "vatCategory" TEXT NOT NULL DEFAULT 'S';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "buyerReference" TEXT,
ADD COLUMN     "eInvoiceDeliveredAt" TIMESTAMP(3),
ADD COLUMN     "eInvoiceProviderData" JSONB,
ADD COLUMN     "eInvoiceProviderRef" TEXT;
