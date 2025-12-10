-- Add encrypted column for API keys (AES-256-GCM encrypted)
ALTER TABLE "Company" ADD COLUMN "eInvoiceApiKeyEncrypted" TEXT;

-- SECURITY: Do NOT copy plaintext keys - users must re-enter their API keys
-- This ensures only encrypted values are ever stored in this column
-- Old plaintext keys are lost intentionally for security

-- Drop the old plaintext column
ALTER TABLE "Company" DROP COLUMN IF EXISTS "eInvoiceApiKey";
