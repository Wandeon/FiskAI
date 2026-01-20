#!/usr/bin/env npx tsx
/**
 * Test RTL2 Lineage Flow
 *
 * This script:
 * 1. Picks a CandidateFact with proper evidenceId
 * 2. Runs generateComposerProposal + applyComposerProposal
 * 3. Verifies the rule has lineage fields populated
 */

// Load environment variables BEFORE importing any modules that use them
import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  // Dynamic imports after env is loaded
  const { db } = await import("../src/lib/db")
  const { generateComposerProposal, applyComposerProposal } =
    await import("../src/lib/regulatory-truth/agents/composer")

  console.log("=== RTL2 Lineage Test ===\n")

  // 1. Find a CandidateFact with proper evidenceId
  console.log("Step 1: Finding CandidateFact with evidence link...")

  const candidate = await db.candidateFact.findFirst({
    where: {
      status: "CAPTURED",
      overallConfidence: { gte: 0.5 },
    },
    orderBy: { overallConfidence: "desc" },
  })

  if (!candidate) {
    console.error("No suitable CandidateFact found")
    process.exit(1)
  }

  const quotes = candidate.groundingQuotes as Array<{ evidenceId?: string }>
  const hasEvidenceId = quotes?.some?.((q) => q.evidenceId)

  console.log(`  Found: ${candidate.id}`)
  console.log(`  Domain: ${candidate.suggestedDomain}`)
  console.log(`  Value: ${candidate.extractedValue?.substring(0, 50)}`)
  console.log(`  Confidence: ${candidate.overallConfidence}`)
  console.log(`  Has evidenceId: ${hasEvidenceId}`)
  console.log(`  First quote evidenceId: ${quotes?.[0]?.evidenceId || "NONE"}`)

  if (!hasEvidenceId) {
    console.error("CandidateFact has no evidenceId in groundingQuotes!")
    process.exit(1)
  }

  // 2. Generate composer proposal
  console.log("\nStep 2: Generating composer proposal...")

  const proposal = await generateComposerProposal([candidate.id], {
    runId: `test-lineage-${Date.now()}`,
    sourceSlug: "test-script",
    queueName: "test",
  })

  if (!proposal.success) {
    console.error(`Proposal generation failed: ${proposal.error}`)
    process.exit(1)
  }

  console.log(`  Success: ${proposal.success}`)
  console.log(`  AgentRunId: ${proposal.agentRunId}`)
  console.log(`  Draft rule concept: ${proposal.output?.draft_rule?.concept_slug}`)

  // 3. Apply the proposal (creates rule with lineage)
  console.log("\nStep 3: Applying proposal (creating rule with lineage)...")

  const applyResult = await applyComposerProposal(proposal)

  if (!applyResult.success) {
    console.error(`Apply failed: ${applyResult.error}`)
    process.exit(1)
  }

  console.log(`  Success: ${applyResult.success}`)
  console.log(`  RuleId: ${applyResult.ruleId}`)
  console.log(`  SourcePointerIds: ${applyResult.sourcePointerIds.length}`)

  // 4. Verify lineage fields are populated
  console.log("\nStep 4: Verifying lineage fields...")

  const rule = await db.regulatoryRule.findUnique({
    where: { id: applyResult.ruleId! },
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

  console.log(`  Rule ID: ${rule.id}`)
  console.log(`  Concept: ${rule.conceptSlug}`)
  console.log(`  Status: ${rule.status}`)
  console.log(`  originatingCandidateFactIds: ${JSON.stringify(rule.originatingCandidateFactIds)}`)
  console.log(`  originatingAgentRunIds: ${JSON.stringify(rule.originatingAgentRunIds)}`)

  const hasCandidateFactLineage =
    rule.originatingCandidateFactIds && rule.originatingCandidateFactIds.length > 0
  const hasAgentRunLineage = rule.originatingAgentRunIds && rule.originatingAgentRunIds.length > 0

  console.log(`\n  RTL2 Lineage Check:`)
  console.log(`    Has CandidateFact lineage: ${hasCandidateFactLineage ? "✓ PASS" : "✗ FAIL"}`)
  console.log(`    Has AgentRun lineage: ${hasAgentRunLineage ? "✓ PASS" : "✗ FAIL"}`)

  if (!hasCandidateFactLineage || !hasAgentRunLineage) {
    console.error("\n❌ RTL2 lineage validation would FAIL")
    process.exit(1)
  }

  console.log("\n✓ RTL2 lineage validation would PASS")
  console.log(`\nRule ${rule.id} is ready for approve/publish!`)

  await db.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
