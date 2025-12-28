-- Split NOT_VERIFIED into NOT_FOUND and PENDING_VERIFICATION
-- This migration handles the enum value transition safely

-- Step 1: Add new enum values
ALTER TYPE "SourcePointerMatchType" ADD VALUE IF NOT EXISTS 'NOT_FOUND';
ALTER TYPE "SourcePointerMatchType" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';
