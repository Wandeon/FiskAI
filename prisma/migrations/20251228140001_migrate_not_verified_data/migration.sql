-- Migrate existing NOT_VERIFIED values to PENDING_VERIFICATION
UPDATE "SourcePointer" 
SET "matchType" = 'PENDING_VERIFICATION'
WHERE "matchType" = 'NOT_VERIFIED';

-- Create new enum without NOT_VERIFIED
CREATE TYPE "SourcePointerMatchType_new" AS ENUM ('EXACT', 'NORMALIZED', 'NOT_FOUND', 'PENDING_VERIFICATION');

-- Update the column to use the new enum
ALTER TABLE "SourcePointer" 
  ALTER COLUMN "matchType" DROP DEFAULT;

ALTER TABLE "SourcePointer" 
  ALTER COLUMN "matchType" TYPE "SourcePointerMatchType_new" 
  USING "matchType"::text::"SourcePointerMatchType_new";

-- Set new default
ALTER TABLE "SourcePointer" 
  ALTER COLUMN "matchType" SET DEFAULT 'PENDING_VERIFICATION'::"SourcePointerMatchType_new";

-- Drop old enum and rename new one
DROP TYPE "SourcePointerMatchType";
ALTER TYPE "SourcePointerMatchType_new" RENAME TO "SourcePointerMatchType";
