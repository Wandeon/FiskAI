-- Legal form / entitlements extension

-- Extend Company with legalForm, entitlements, featureFlags
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "legalForm" TEXT,
  ADD COLUMN IF NOT EXISTS "entitlements" JSONB,
  ADD COLUMN IF NOT EXISTS "featureFlags" JSONB;

-- Backfill defaults for existing rows
UPDATE "Company"
SET
  "legalForm" = COALESCE("legalForm", 'DOO'),
  "entitlements" = COALESCE("entitlements", '["invoicing","expenses","banking","reports","settings"]'::jsonb),
  "featureFlags" = COALESCE("featureFlags", '{}'::jsonb);
