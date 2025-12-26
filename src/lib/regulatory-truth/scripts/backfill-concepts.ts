// src/lib/regulatory-truth/scripts/backfill-concepts.ts
// Backfill concepts for existing rules - AUDIT LOGGED

import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local")
config({ path: envPath })

import { db } from "@/lib/db"
import { logAuditEvent } from "../utils/audit-log"

async function backfillConcepts() {
  console.log("[backfill] Starting Knowledge Graph backfill...")

  // Find rules without concepts
  const rulesWithoutConcepts = await db.regulatoryRule.findMany({
    where: { conceptId: null },
    select: {
      id: true,
      conceptSlug: true,
      titleHr: true,
      titleEn: true,
      explanationHr: true,
      riskTier: true,
      authorityLevel: true,
    },
  })

  console.log(`[backfill] Found ${rulesWithoutConcepts.length} rules without concepts`)

  let created = 0
  let linked = 0

  for (const rule of rulesWithoutConcepts) {
    try {
      // Upsert concept
      const concept = await db.concept.upsert({
        where: { slug: rule.conceptSlug },
        create: {
          slug: rule.conceptSlug,
          nameHr: rule.titleHr,
          nameEn: rule.titleEn || rule.titleHr,
          description: rule.explanationHr,
          tags: [rule.riskTier, rule.authorityLevel].filter(Boolean),
        },
        update: {
          // Update if names are longer/better
          nameHr: rule.titleHr,
          nameEn: rule.titleEn || undefined,
        },
      })

      // Check if this was a new concept
      const existingConcept = await db.concept.findUnique({
        where: { slug: rule.conceptSlug },
      })
      if (existingConcept?.id === concept.id) {
        created++
      }

      // Link rule to concept
      await db.regulatoryRule.update({
        where: { id: rule.id },
        data: { conceptId: concept.id },
      })

      // AUDIT LOG: Track concept linking
      await logAuditEvent({
        action: "RULE_CONCEPT_LINKED",
        entityType: "RULE",
        entityId: rule.id,
        metadata: {
          conceptId: concept.id,
          conceptSlug: concept.slug,
          backfillScript: "backfill-concepts.ts",
        },
      })

      linked++

      console.log(`[backfill] ✓ Linked rule ${rule.id} to concept ${concept.slug}`)
    } catch (error) {
      console.error(`[backfill] ✗ Failed for rule ${rule.id}:`, error)
    }
  }

  console.log(`[backfill] Complete: ${created} concepts created, ${linked} rules linked`)
}

backfillConcepts()
  .catch(console.error)
  .finally(() => process.exit(0))
