// src/__tests__/helpers/db-cleanup.ts
/**
 * Test Database Cleanup Helpers
 *
 * IMPORTANT: This is the ONLY authorized location for destructive database operations
 * that bypass Prisma extensions. All test cleanup MUST use these helpers.
 *
 * Why: Evidence hard-delete is prohibited in production via Prisma extension.
 * Tests need cleanup, but we centralize the escape hatch here to:
 * 1. Limit blast radius to one file
 * 2. Make it easy to audit all destructive operations
 * 3. Prevent copy-paste of raw SQL elsewhere
 *
 * Enforcement: CI should fail if `$executeRaw.*DELETE FROM "Evidence"` appears
 * outside this file. Add a grep check or ESLint rule.
 */

import { dbReg } from "@/lib/db/regulatory"

/**
 * Delete Evidence records by IDs.
 * Uses raw SQL to bypass the hard-delete prohibition extension.
 *
 * ⚠️ TEST ONLY - Do not use in production code
 *
 * @param ids - Array of Evidence IDs to delete
 * @returns Number of deleted records
 */
export async function deleteEvidenceForTest(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0

  // Validate we're in test environment
  if (process.env.NODE_ENV === "production") {
    throw new Error("deleteEvidenceForTest cannot be used in production")
  }

  // Use parameterized query to prevent SQL injection
  // Prisma's $executeRaw with template literal handles escaping
  const result = await dbReg.$executeRawUnsafe(
    `DELETE FROM "Evidence" WHERE id IN (${ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})`
  )

  return Number(result)
}

/**
 * Delete a single Evidence record by ID.
 * Uses raw SQL to bypass the hard-delete prohibition extension.
 *
 * ⚠️ TEST ONLY - Do not use in production code
 *
 * @param id - Evidence ID to delete
 * @returns true if deleted, false if not found
 */
export async function deleteOneEvidenceForTest(id: string): Promise<boolean> {
  if (!id) return false

  // Validate we're in test environment
  if (process.env.NODE_ENV === "production") {
    throw new Error("deleteOneEvidenceForTest cannot be used in production")
  }

  const result = await dbReg.$executeRaw`DELETE FROM "Evidence" WHERE id = ${id}`
  return Number(result) > 0
}

/**
 * Delete EvidenceArtifact records by Evidence IDs.
 * Artifacts cascade with Evidence, but if you need explicit cleanup.
 *
 * ⚠️ TEST ONLY - Do not use in production code
 */
export async function deleteEvidenceArtifactsForTest(evidenceIds: string[]): Promise<number> {
  if (evidenceIds.length === 0) return 0

  if (process.env.NODE_ENV === "production") {
    throw new Error("deleteEvidenceArtifactsForTest cannot be used in production")
  }

  const result = await dbReg.$executeRawUnsafe(
    `DELETE FROM "EvidenceArtifact" WHERE "evidenceId" IN (${evidenceIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})`
  )

  return Number(result)
}
