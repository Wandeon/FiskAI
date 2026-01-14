-- Add latency tracking and provider identification to AI usage records
-- Part of PR-7: Unified LLM accounting contract

-- Add nullable columns for backwards compatibility
ALTER TABLE "AIUsage" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "AIUsage" ADD COLUMN "provider" TEXT;

-- Add index for provider-based queries (usage by provider over time)
CREATE INDEX "AIUsage_provider_createdAt_idx" ON "AIUsage"("provider", "createdAt");
