-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SourcePointer" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Change Evidence relation from Cascade to SetNull
-- Drop existing foreign key constraint
ALTER TABLE "SourcePointer" DROP CONSTRAINT "SourcePointer_evidenceId_fkey";

-- Recreate foreign key with SetNull
ALTER TABLE "SourcePointer" ADD CONSTRAINT "SourcePointer_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
