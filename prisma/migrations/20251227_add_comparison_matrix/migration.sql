-- AlterEnum
ALTER TYPE "AgentType" ADD VALUE 'COMPARISON_EXTRACTOR';

-- CreateTable
CREATE TABLE "ComparisonMatrix" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleHr" TEXT NOT NULL,
    "titleEn" TEXT,
    "appliesWhen" TEXT,
    "domainTags" TEXT[],
    "options" JSONB NOT NULL,
    "criteria" JSONB NOT NULL,
    "cells" JSONB NOT NULL,
    "conclusion" TEXT,
    "evidenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComparisonMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComparisonMatrix_slug_key" ON "ComparisonMatrix"("slug");

-- CreateIndex
CREATE INDEX "ComparisonMatrix_domainTags_idx" ON "ComparisonMatrix"("domainTags");

-- CreateIndex
CREATE INDEX "ComparisonMatrix_evidenceId_idx" ON "ComparisonMatrix"("evidenceId");

-- AddForeignKey
ALTER TABLE "ComparisonMatrix" ADD CONSTRAINT "ComparisonMatrix_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
