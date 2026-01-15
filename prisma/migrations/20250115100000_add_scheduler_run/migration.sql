-- Task 1.2: RTL Autonomy - Scheduler Run Persistence + Catch-up
-- Tracks scheduled job runs to detect missed executions and enable catch-up.
-- Uses row-level locking to prevent concurrent runs of the same job type.

-- CreateEnum
CREATE TYPE "regulatory"."SchedulerRunStatus" AS ENUM ('EXPECTED', 'RUNNING', 'COMPLETED', 'FAILED', 'MISSED');

-- CreateTable
CREATE TABLE "regulatory"."SchedulerRun" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "regulatory"."SchedulerRunStatus" NOT NULL DEFAULT 'EXPECTED',
    "errorMessage" TEXT,
    "lockHolder" TEXT,

    CONSTRAINT "SchedulerRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulerRun_jobType_status_idx" ON "regulatory"."SchedulerRun"("jobType", "status");

-- CreateIndex
CREATE INDEX "SchedulerRun_scheduledAt_idx" ON "regulatory"."SchedulerRun"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulerRun_jobType_scheduledAt_key" ON "regulatory"."SchedulerRun"("jobType", "scheduledAt");
