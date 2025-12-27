-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('HUB', 'LEAF', 'ASSET');

-- CreateEnum
CREATE TYPE "NodeRole" AS ENUM ('ARCHIVE', 'INDEX', 'NEWS_FEED', 'REGULATION', 'FORM', 'GUIDANCE');

-- CreateEnum
CREATE TYPE "FreshnessRisk" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "DiscoveredItem" ADD COLUMN "nodeType" "NodeType" NOT NULL DEFAULT 'LEAF';
ALTER TABLE "DiscoveredItem" ADD COLUMN "nodeRole" "NodeRole";
ALTER TABLE "DiscoveredItem" ADD COLUMN "parentUrl" TEXT;
ALTER TABLE "DiscoveredItem" ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DiscoveredItem" ADD COLUMN "changeFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "DiscoveredItem" ADD COLUMN "lastChangedAt" TIMESTAMP(3);
ALTER TABLE "DiscoveredItem" ADD COLUMN "scanCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DiscoveredItem" ADD COLUMN "freshnessRisk" "FreshnessRisk" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "DiscoveredItem" ADD COLUMN "nextScanDue" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "DiscoveredItem_nextScanDue_freshnessRisk_idx" ON "DiscoveredItem"("nextScanDue", "freshnessRisk");

-- CreateIndex
CREATE INDEX "DiscoveredItem_endpointId_nodeType_idx" ON "DiscoveredItem"("endpointId", "nodeType");
