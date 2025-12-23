-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN "rawOutput" JSONB;

-- CreateTable
CREATE TABLE "SoftFailLog" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "errorMessage" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoftFailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SoftFailLog_operation_idx" ON "SoftFailLog"("operation");

-- CreateIndex
CREATE INDEX "SoftFailLog_createdAt_idx" ON "SoftFailLog"("createdAt");

-- CreateIndex
CREATE INDEX "SoftFailLog_entityType_entityId_idx" ON "SoftFailLog"("entityType", "entityId");
