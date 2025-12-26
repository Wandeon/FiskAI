// src/lib/regulatory-truth/utils/content-hash.ts
import { createHash } from "crypto"

/**
 * Normalize HTML content for change detection (NOT for immutability).
 * Removes whitespace variations and dynamic content.
 *
 * WARNING: Do NOT use this for JSON/API content - it destroys valid data.
 * Use hashRawContent() for immutability hashing.
 */
export function normalizeHtmlContent(content: string): string {
  return (
    content
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove style tags
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      // Remove common dynamic elements (timestamps, session IDs)
      .replace(/\b\d{10,13}\b/g, "") // Unix timestamps
      .replace(/[a-f0-9]{32,}/gi, "") // Session IDs / hashes
      // Trim
      .trim()
  )
}

/**
 * @deprecated Use hashRawContent() for immutability, normalizeHtmlContent() for HTML dedup
 */
export function normalizeContent(content: string): string {
  return normalizeHtmlContent(content)
}

/**
 * Hash raw content for IMMUTABILITY verification.
 * No normalization - preserves exact bytes for audit trail.
 *
 * Use this for:
 * - Evidence contentHash (audit immutability)
 * - JSON/API responses
 * - Any content where exact bytes matter
 */
export function hashRawContent(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

/**
 * Hash content with optional content-type awareness.
 * - JSON/API: raw hash (no normalization)
 * - HTML: normalized hash (for change detection)
 *
 * @param content - The content to hash
 * @param contentType - MIME type or 'json'/'html' hint
 */
export function hashContent(content: string, contentType?: string): string {
  // Detect JSON content
  const isJson =
    contentType?.includes("json") ||
    contentType?.includes("application/ld+json") ||
    (content.trim().startsWith("{") && content.trim().endsWith("}")) ||
    (content.trim().startsWith("[") && content.trim().endsWith("]"))

  if (isJson) {
    // JSON: hash raw bytes for immutability
    return hashRawContent(content)
  }

  // HTML/text: normalize for change detection
  const normalized = normalizeHtmlContent(content)
  return createHash("sha256").update(normalized).digest("hex")
}

/**
 * Check if content has changed based on hash comparison.
 * Returns { hasChanged, newHash, changePercentage }
 */
export function detectContentChange(
  newContent: string,
  previousHash: string | null
): {
  hasChanged: boolean
  newHash: string
  isSignificant: boolean
} {
  const newHash = hashContent(newContent)
  const hasChanged = previousHash !== newHash

  return {
    hasChanged,
    newHash,
    isSignificant: hasChanged, // For now, any change is significant
  }
}

// ============================================
// EVIDENCE INTEGRITY VERIFICATION
// ============================================

export interface EvidenceIntegrityCheck {
  valid: boolean
  expectedHash: string
  actualHash: string
  evidenceId: string
  error?: string
}

/**
 * Verify the integrity of an Evidence record.
 * Compares stored contentHash against computed hash of rawContent.
 *
 * This should be called when reading evidence for regulatory operations
 * to detect any tampering with the source content.
 */
export function verifyEvidenceIntegrity(evidence: {
  id: string
  rawContent: string
  contentHash: string
  contentType?: string
}): EvidenceIntegrityCheck {
  const actualHash = hashContent(evidence.rawContent, evidence.contentType)

  const valid = actualHash === evidence.contentHash

  return {
    valid,
    expectedHash: evidence.contentHash,
    actualHash,
    evidenceId: evidence.id,
    ...(valid ? {} : { error: "Content hash mismatch - evidence may have been tampered with" }),
  }
}

/**
 * Verify multiple evidence records in batch.
 * Returns array of invalid evidence (empty if all valid).
 */
export function verifyEvidenceBatch(
  evidenceRecords: Array<{
    id: string
    rawContent: string
    contentHash: string
    contentType?: string
  }>
): EvidenceIntegrityCheck[] {
  const results: EvidenceIntegrityCheck[] = []

  for (const evidence of evidenceRecords) {
    const check = verifyEvidenceIntegrity(evidence)
    if (!check.valid) {
      results.push(check)
    }
  }

  return results
}
