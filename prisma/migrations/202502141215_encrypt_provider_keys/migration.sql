ALTER TABLE "Company" ADD COLUMN "eInvoiceApiKeyEncrypted" TEXT;
UPDATE "Company" SET "eInvoiceApiKeyEncrypted" = "eInvoiceApiKey" WHERE "eInvoiceApiKey" IS NOT NULL;
ALTER TABLE "Company" DROP COLUMN "eInvoiceApiKey";
