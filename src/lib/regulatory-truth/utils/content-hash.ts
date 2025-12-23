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
