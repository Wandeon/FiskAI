-- Add confidence tracking and review columns to RegulatoryRule
-- These support Mission #3: confidence, auditability, rollback

-- Confidence Envelope columns
ALTER TABLE "RegulatoryRule" ADD COLUMN IF NOT EXISTS "confidenceReasons" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "RegulatoryRule" ADD COLUMN IF NOT EXISTS "originatingCandidateFactIds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "RegulatoryRule" ADD COLUMN IF NOT EXISTS "originatingAgentRunIds" TEXT[] NOT NULL DEFAULT '{}';

-- Human Review Readiness columns
ALTER TABLE "RegulatoryRule" ADD COLUMN IF NOT EXISTS "reviewRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RegulatoryRule" ADD COLUMN IF NOT EXISTS "reviewRequiredReasons" JSONB;

-- Rollback Capability columns
ALTER TABLE "RegulatoryRule" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
ALTER TABLE "RegulatoryRule" ADD COLUMN IF NOT EXISTS "revokedReason" TEXT;
