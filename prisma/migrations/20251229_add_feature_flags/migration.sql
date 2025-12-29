-- CreateEnum
CREATE TYPE "FeatureFlagType" AS ENUM ('BOOLEAN', 'PERCENTAGE', 'USER_LIST', 'COMPANY_LIST');

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FeatureFlagType" NOT NULL DEFAULT 'BOOLEAN',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER,
    "allowedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedCompanyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "owner" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagOverride" (
    "id" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "reason" TEXT,

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagHistory" (
    "id" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlagHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_category_idx" ON "FeatureFlag"("category");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_companyId_idx" ON "FeatureFlagOverride"("companyId");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_userId_idx" ON "FeatureFlagOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagOverride_featureFlagId_companyId_key" ON "FeatureFlagOverride"("featureFlagId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagOverride_featureFlagId_userId_key" ON "FeatureFlagOverride"("featureFlagId", "userId");

-- CreateIndex
CREATE INDEX "FeatureFlagHistory_featureFlagId_idx" ON "FeatureFlagHistory"("featureFlagId");

-- CreateIndex
CREATE INDEX "FeatureFlagHistory_changedAt_idx" ON "FeatureFlagHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagHistory" ADD CONSTRAINT "FeatureFlagHistory_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed some default feature flags
INSERT INTO "FeatureFlag" ("id", "key", "name", "description", "category", "enabled", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'reasoning-ux', 'Visible Reasoning UX', 'Show AI reasoning steps in the assistant interface', 'ai', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'reasoning-live', 'Reasoning Live Mode', 'Use live reasoning pipeline instead of legacy', 'ai', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'ai-assistant-v2', 'AI Assistant V2', 'New AI assistant interface and capabilities', 'ai', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'dark-mode', 'Dark Mode', 'Enable dark theme support', 'ui', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'beta-features', 'Beta Features', 'Enable beta features for testing', 'beta', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'email-import', 'Email Import', 'Import invoices from email attachments', 'experimental', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'bank-sync-v2', 'Bank Sync V2', 'New bank synchronization system', 'experimental', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'pos-mode', 'POS Mode', 'Point of Sale mode for retail', 'experimental', false, NOW(), NOW());
