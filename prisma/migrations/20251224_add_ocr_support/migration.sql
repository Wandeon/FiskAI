-- AlterTable: Add OCR support fields to Evidence
ALTER TABLE "Evidence" ADD COLUMN "contentClass" TEXT NOT NULL DEFAULT 'HTML';
ALTER TABLE "Evidence" ADD COLUMN "ocrMetadata" JSONB;
ALTER TABLE "Evidence" ADD COLUMN "primaryTextArtifactId" TEXT;

-- CreateTable: EvidenceArtifact
CREATE TABLE "EvidenceArtifact" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "pageMap" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evidence_contentClass_idx" ON "Evidence"("contentClass");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_evidenceId_idx" ON "EvidenceArtifact"("evidenceId");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_kind_idx" ON "EvidenceArtifact"("kind");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_createdAt_idx" ON "EvidenceArtifact"("createdAt");

-- AddForeignKey
ALTER TABLE "EvidenceArtifact" ADD CONSTRAINT "EvidenceArtifact_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
