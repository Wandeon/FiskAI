import { EInvoiceStatus } from "@prisma/client"

/**
 * Valid status transitions for e-invoices
 *
 * This defines the allowed state machine for invoice status changes.
 * Each status maps to an array of statuses it can transition to.
 *
 * Based on the invoice lifecycle:
 * - DRAFT: Initial state, can be fiscalized or sent directly
 * - PENDING_FISCALIZATION: Queued for fiscalization
 * - FISCALIZED: Successfully fiscalized, can be sent
 * - SENT: Sent to recipient, awaiting delivery
 * - DELIVERED: Received by recipient, awaiting acceptance
 * - ACCEPTED: Accepted by recipient (terminal for success)
 * - REJECTED: Rejected by recipient (terminal for rejection)
 * - ARCHIVED: Archived (terminal state)
 * - ERROR: Error occurred, can retry or go back to draft
 */
export const validTransitions: Record<EInvoiceStatus, EInvoiceStatus[]> = {
  DRAFT: ["PENDING_FISCALIZATION", "FISCALIZED", "SENT", "ERROR"],
  PENDING_FISCALIZATION: ["FISCALIZED", "ERROR"],
  FISCALIZED: ["SENT", "ACCEPTED", "ARCHIVED"],
  SENT: ["DELIVERED", "ACCEPTED", "REJECTED", "ERROR"],
  DELIVERED: ["ACCEPTED", "REJECTED", "ARCHIVED"],
  ACCEPTED: ["ARCHIVED"],
  REJECTED: ["ARCHIVED"],
  ARCHIVED: [], // Terminal state - no transitions allowed
  ERROR: ["DRAFT", "PENDING_FISCALIZATION"], // Allow retry
}

/**
 * Validates if a status transition is allowed
 *
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns true if transition is valid, false otherwise
 */
export function validateStatusTransition(
  fromStatus: EInvoiceStatus,
  toStatus: EInvoiceStatus
): boolean {
  // If status is not changing, always allow (idempotent update)
  if (fromStatus === toStatus) {
    return true
  }

  const allowedTransitions = validTransitions[fromStatus]
  return allowedTransitions?.includes(toStatus) ?? false
}

/**
 * Gets a human-readable error message for an invalid transition
 *
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns Error message in Croatian
 */
export function getTransitionErrorMessage(
  fromStatus: EInvoiceStatus,
  toStatus: EInvoiceStatus
): string {
  const statusLabels: Record<EInvoiceStatus, string> = {
    DRAFT: "nacrt",
    PENDING_FISCALIZATION: "čeka fiskalizaciju",
    FISCALIZED: "fiskaliziran",
    SENT: "poslan",
    DELIVERED: "dostavljen",
    ACCEPTED: "prihvaćen",
    REJECTED: "odbijen",
    ARCHIVED: "arhiviran",
    ERROR: "greška",
  }

  const fromLabel = statusLabels[fromStatus] || fromStatus
  const toLabel = statusLabels[toStatus] || toStatus

  // Special messages for common invalid transitions
  if (fromStatus === "ARCHIVED") {
    return `Arhivirani računi ne mogu mijenjati status (pokušaj prelaska u status: ${toLabel})`
  }

  if (fromStatus === "FISCALIZED" && toStatus === "DRAFT") {
    return "Fiskalizirani računi ne mogu biti vraćeni u nacrt"
  }

  if (fromStatus === "ACCEPTED" && toStatus !== "ARCHIVED") {
    return "Prihvaćeni računi mogu biti samo arhivirani"
  }

  if (fromStatus === "REJECTED" && toStatus !== "ARCHIVED") {
    return "Odbijeni računi mogu biti samo arhivirani"
  }

  if (fromStatus === "DRAFT" && toStatus === "ACCEPTED") {
    return "Računi moraju biti fiskalizirani prije nego što mogu biti prihvaćeni"
  }

  // Generic message
  return `Nevažeći prijelaz statusa: ${fromLabel} → ${toLabel}`
}

/**
 * Validates a status transition and returns a validation result
 *
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns Validation result with success flag and optional error message
 */
export function validateTransition(
  fromStatus: EInvoiceStatus,
  toStatus: EInvoiceStatus
): { valid: boolean; error?: string } {
  const isValid = validateStatusTransition(fromStatus, toStatus)

  if (!isValid) {
    return {
      valid: false,
      error: getTransitionErrorMessage(fromStatus, toStatus),
    }
  }

  return { valid: true }
}
