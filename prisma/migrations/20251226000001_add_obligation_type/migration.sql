-- CreateEnum
CREATE TYPE "ObligationType" AS ENUM ('OBLIGATION', 'NO_OBLIGATION', 'CONDITIONAL', 'INFORMATIONAL');

-- AlterTable
ALTER TABLE "RegulatoryRule" ADD COLUMN "obligationType" "ObligationType" NOT NULL DEFAULT 'OBLIGATION';
