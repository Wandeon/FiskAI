#!/usr/bin/env npx tsx
/**
 * Approve and Publish a Rule
 *
 * Tests the full approval/publication flow for a lineage-valid rule
 *
 * Status flow: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED
 */

import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const { db } = await import("../src/lib/db")
  const { approveRule, publishRules } =
    await import("../src/lib/regulatory-truth/services/rule-status-service")
  const { runWithRegulatoryContext } = await import("../src/lib/db")

  const ruleId = process.argv[2]
  if (!ruleId) {
    console.error("Usage: npx tsx scripts/approve-and-publish-rule.ts <ruleId>")
    process.exit(1)
  }

  console.log(`=== Approve and Publish Rule ${ruleId} ===\n`)

  // Check initial state
  const rule = await db.regulatoryRule.findUnique({
    where: { id: ruleId },
    select: {
      id: true,
      conceptSlug: true,
      status: true,
      originatingCandidateFactIds: true,
      originatingAgentRunIds: true,
    },
  })

  if (!rule) {
    console.error("Rule not found!")
    process.exit(1)
  }

  console.log(`Current status: ${rule.status}`)
  console.log(`Concept: ${rule.conceptSlug}`)
  console.log(`CandidateFact lineage: ${rule.originatingCandidateFactIds.length} IDs`)
  console.log(`AgentRun lineage: ${rule.originatingAgentRunIds.length} IDs`)

  // Step 1: DRAFT → PENDING_REVIEW
  if (rule.status === "DRAFT") {
    console.log("\n--- Transitioning DRAFT → PENDING_REVIEW ---")
    await db.regulatoryRule.update({
      where: { id: ruleId },
      data: { status: "PENDING_REVIEW" },
    })
    console.log("Status updated to PENDING_REVIEW")
  }

  // Step 2: PENDING_REVIEW → APPROVED
  const afterPendingReview = await db.regulatoryRule.findUnique({
    where: { id: ruleId },
    select: { status: true },
  })

  if (afterPendingReview?.status === "PENDING_REVIEW") {
    console.log("\n--- Approving rule (PENDING_REVIEW → APPROVED) ---")
    const approveResult = await runWithRegulatoryContext(
      { source: "test-script", actorUserId: "test-script", autoApprove: false },
      async () => {
        return await approveRule(ruleId, "test-script", "test-script")
      }
    )

    console.log(`Success: ${approveResult.success}`)
    if (!approveResult.success) {
      console.error(`Error: ${approveResult.error}`)
      process.exit(1)
    }
  }

  // Step 3: APPROVED → PUBLISHED
  const updatedRule = await db.regulatoryRule.findUnique({
    where: { id: ruleId },
    select: { status: true },
  })

  if (updatedRule?.status === "APPROVED") {
    console.log("\n--- Publishing rule (APPROVED → PUBLISHED) ---")
    const publishResult = await publishRules([ruleId], "test-script", "test-script")

    console.log(`Published: ${publishResult.publishedCount}`)
    console.log(`Failed: ${publishResult.failedCount}`)

    if (publishResult.failedCount > 0) {
      console.log("Publication failures:")
      for (const error of publishResult.errors) {
        console.log(`  - ${error}`)
      }
      for (const result of publishResult.results) {
        if (!result.success) {
          console.log(`  - ${result.ruleId}: ${result.error}`)
        }
      }
      process.exit(1)
    }
  }

  // Final state
  const finalRule = await db.regulatoryRule.findUnique({
    where: { id: ruleId },
    select: { status: true },
  })

  console.log(`\n=== Final status: ${finalRule?.status} ===`)

  if (finalRule?.status === "PUBLISHED") {
    console.log("\n✓ SUCCESS: First lineage-valid rule published!")
  }

  await db.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
