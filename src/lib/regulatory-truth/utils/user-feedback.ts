// src/lib/regulatory-truth/utils/user-feedback.ts
//
// Task 4.1: RTL Autonomy - User Feedback Loop
//
// Provides utilities for collecting and analyzing user feedback on AI assistant responses.
// Correlates feedback to specific regulatory rules to identify rules with poor accuracy.
//
// Critical Safeguards (Appendix A.4):
// - Minimal Data: Store only ruleId, sentiment, timestamp, appVersion, optional reasonCode
// - No PII: Do not store user identifiers by default
// - Hashed ID: If needed, use one-way salted hash with consent
// - Retention: 12-month retention policy
// - UI Opt-in: Requires privacy policy update and UI opt-in

import { createHash } from "crypto"

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Retention period for feedback records in months.
 * Records older than this should be deleted by the cleanup job.
 */
export const RETENTION_MONTHS = 12

/**
 * Threshold for flagging rules with high negative feedback.
 * Rules with negative feedback percentage > this value are queued for review.
 */
export const NEGATIVE_FEEDBACK_THRESHOLD = 0.3 // 30%

/**
 * Salt for hashing user IDs. This ensures hashes cannot be reversed
 * even if someone has access to the database and the hashing algorithm.
 * In production, this should come from environment variables.
 */
const USER_ID_HASH_SALT = process.env.FEEDBACK_HASH_SALT || "fiskai-feedback-salt-v1"

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Feedback sentiment values.
 */
export enum Sentiment {
  POSITIVE = "positive",
  NEGATIVE = "negative",
}

/**
 * Optional reason codes for negative feedback.
 * Helps understand why users are giving negative feedback.
 */
export enum ReasonCode {
  INACCURATE = "inaccurate", // The information was wrong
  OUTDATED = "outdated", // The information is no longer current
  UNCLEAR = "unclear", // The explanation was confusing
  OTHER = "other", // Other reason
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Input for creating a feedback record.
 * Note: userId and hasConsent are used to generate anonymousUserHash,
 * but are NOT stored in the record.
 */
export interface FeedbackInput {
  ruleId: string
  sentiment: Sentiment
  appVersion: string
  reasonCode?: ReasonCode
  userId?: string // Only used to generate hash if hasConsent is true
  hasConsent?: boolean // Must be explicitly true to store hashed user ID
}

/**
 * A feedback record ready for storage.
 * Does NOT include any PII.
 */
export interface FeedbackRecord {
  ruleId: string
  sentiment: string
  appVersion: string
  reasonCode?: string
  anonymousUserHash?: string // Only present if user consented
  createdAt: Date
}

/**
 * Aggregated feedback counts for a rule.
 */
export interface FeedbackCounts {
  positive: number
  negative: number
}

/**
 * Rule with calculated negative feedback statistics.
 */
export interface RuleWithNegativeFeedback {
  ruleId: string
  negativePercent: number
  totalFeedback: number
}

// =============================================================================
// PURE FUNCTIONS (No database dependencies)
// =============================================================================

/**
 * Hash a user ID with consent.
 *
 * Returns undefined if:
 * - hasConsent is false or undefined
 * - userId is undefined or empty
 *
 * Uses SHA-256 with a salt to ensure one-way hashing.
 */
export function hashUserIdWithConsent(
  userId: string | undefined,
  hasConsent: boolean | undefined
): string | undefined {
  // No consent = no hash
  if (!hasConsent) {
    return undefined
  }

  // No userId = no hash
  if (!userId || userId.length === 0) {
    return undefined
  }

  // Create salted hash
  const hash = createHash("sha256")
  hash.update(USER_ID_HASH_SALT + userId)
  return hash.digest("hex")
}

/**
 * Create a feedback record from input.
 *
 * This function enforces privacy safeguards:
 * - Only stores minimal required data
 * - Does NOT store userId, sessionId, or any PII
 * - Only stores anonymousUserHash if explicit consent given
 */
export function createFeedbackRecord(input: FeedbackInput): FeedbackRecord {
  const record: FeedbackRecord = {
    ruleId: input.ruleId,
    sentiment: input.sentiment,
    appVersion: input.appVersion,
    createdAt: new Date(),
  }

  // Add optional reasonCode if provided
  if (input.reasonCode) {
    record.reasonCode = input.reasonCode
  }

  // Add anonymousUserHash ONLY if user consented
  const hash = hashUserIdWithConsent(input.userId, input.hasConsent)
  if (hash) {
    record.anonymousUserHash = hash
  }

  return record
}

/**
 * Get the retention cutoff date.
 *
 * Returns a date N months ago from now.
 * Records created before this date should be deleted.
 */
export function getRetentionCutoffDate(retentionMonths: number = RETENTION_MONTHS): Date {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - retentionMonths)
  return cutoff
}

/**
 * Check if a feedback record has expired based on retention policy.
 *
 * Returns true if the record's createdAt is BEFORE the retention cutoff.
 * Records at exactly the cutoff are NOT expired.
 */
export function isRetentionExpired(
  record: FeedbackRecord,
  retentionMonths: number = RETENTION_MONTHS
): boolean {
  const cutoff = getRetentionCutoffDate(retentionMonths)
  return record.createdAt < cutoff
}

/**
 * Calculate the negative feedback percentage for a rule.
 *
 * Returns a value between 0 and 1.
 * Returns 0 if there is no feedback.
 */
export function calculateNegativeFeedbackPercentage(counts: FeedbackCounts): number {
  const total = counts.positive + counts.negative
  if (total === 0) {
    return 0
  }
  return counts.negative / total
}

/**
 * Filter rules that exceed the negative feedback threshold.
 *
 * Returns rules sorted by negative percentage descending (worst first).
 * Uses > threshold (not >=) so exactly 30% is not flagged.
 */
export function filterRulesWithHighNegativeFeedback(
  ruleStats: RuleWithNegativeFeedback[],
  threshold: number = NEGATIVE_FEEDBACK_THRESHOLD
): RuleWithNegativeFeedback[] {
  return ruleStats
    .filter((rule) => rule.negativePercent > threshold)
    .sort((a, b) => b.negativePercent - a.negativePercent)
}

// =============================================================================
// DATABASE FUNCTIONS (Exported separately for use with dbReg)
// =============================================================================

// Note: The actual database functions that use Prisma are defined in a separate
// file to maintain separation between pure logic and database operations.
// See: user-feedback.db.ts (to be created when needed)
//
// Functions that will need database access:
// - recordFeedback(): Promise<void> - Stores feedback in database
// - getRulesWithNegativeFeedback(): Promise<RuleWithNegativeFeedback[]> - Aggregates from DB
// - cleanupOldFeedback(): Promise<number> - Deletes expired records
