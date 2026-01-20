-- Event-Driven KG Edges Migration
--
-- This migration adds infrastructure for event-driven edge building:
-- 1. GraphNamespace enum for namespace-scoped graphs
-- 2. GraphStatus enum for tracking edge state per rule
-- 3. namespace column on GraphEdge
-- 4. graphStatus column on RegulatoryRule
-- 5. Updated unique constraint on GraphEdge to include namespace

-- CreateEnum: GraphNamespace
CREATE TYPE "GraphNamespace" AS ENUM ('SRG', 'CBG');

-- CreateEnum: GraphStatus
CREATE TYPE "GraphStatus" AS ENUM ('PENDING', 'CURRENT', 'STALE');

-- Add namespace column to GraphEdge
ALTER TABLE "GraphEdge" ADD COLUMN "namespace" "GraphNamespace" NOT NULL DEFAULT 'SRG';

-- Add graphStatus column to RegulatoryRule
ALTER TABLE "RegulatoryRule" ADD COLUMN "graphStatus" "GraphStatus" NOT NULL DEFAULT 'PENDING';

-- Update unique constraint on GraphEdge to include namespace
-- First, drop the existing constraint
DROP INDEX IF EXISTS "GraphEdge_fromRuleId_toRuleId_relation_key";

-- Then create the new constraint with namespace
CREATE UNIQUE INDEX "GraphEdge_namespace_fromRuleId_toRuleId_relation_key"
ON "GraphEdge"("namespace", "fromRuleId", "toRuleId", "relation");

-- Add index on namespace for filtered queries
CREATE INDEX "GraphEdge_namespace_idx" ON "GraphEdge"("namespace");
