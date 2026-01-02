/**
 * Capability Action Types
 *
 * Types for executing capability-driven actions.
 *
 * @module capabilities/actions
 * @since PHASE 2 - Capability-Driven Actions
 */

/**
 * Result of executing an action.
 *
 * @template T - Type of the data returned on success
 */
export interface ActionResult<T = unknown> {
  /** Whether the action succeeded */
  success: boolean

  /** Data returned on success */
  data?: T

  /** Error message on failure */
  error?: string

  /** Machine-readable error code */
  code?: ActionErrorCode

  /** Additional details about the result */
  details?: Record<string, unknown>
}

/**
 * Error codes for action failures.
 *
 * These codes align with capability blockers and HTTP semantics:
 * - UNAUTHORIZED: User lacks permission (401/403)
 * - VALIDATION_ERROR: Invalid input (400)
 * - NOT_FOUND: Entity not found (404)
 * - CAPABILITY_BLOCKED: Capability is blocked by business rule
 * - PERIOD_LOCKED: Accounting period is locked
 * - ENTITY_IMMUTABLE: Entity cannot be modified
 * - RATE_LIMITED: Too many requests (429)
 * - INTERNAL_ERROR: Server error (500)
 */
export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CAPABILITY_BLOCKED"
  | "PERIOD_LOCKED"
  | "ENTITY_IMMUTABLE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"

/**
 * Context provided to action handlers.
 *
 * Contains information about the user, company, and entity being acted upon.
 */
export interface ActionContext {
  /** ID of the authenticated user */
  userId: string

  /** ID of the company context */
  companyId: string

  /** ID of the entity being acted upon (optional) */
  entityId?: string

  /** Type of entity being acted upon (optional) */
  entityType?: string

  /** User's permissions for this company */
  permissions: string[]
}

/**
 * Parameters passed to action handlers.
 *
 * The `id` field is commonly used for entity identification.
 * Additional properties can be passed for action-specific data.
 */
export interface ActionParams {
  /** Entity ID for the action (optional) */
  id?: string

  /** Additional action-specific parameters */
  [key: string]: unknown
}

/**
 * Function signature for action handlers.
 *
 * Action handlers execute business logic for a capability action.
 * They receive context about the user/company and optional parameters.
 *
 * @template T - Type of the data returned on success
 * @param context - Action execution context
 * @param params - Optional action parameters
 * @returns Promise resolving to the action result
 */
export type ActionHandler<T = unknown> = (
  context: ActionContext,
  params?: ActionParams
) => Promise<ActionResult<T>>

/**
 * Entry in the action registry.
 *
 * Maps capability actions to their handlers and required permissions.
 */
export interface ActionRegistryEntry {
  /** ID of the capability (e.g., "INV-001") */
  capabilityId: string

  /** ID of the action within the capability (e.g., "create", "update") */
  actionId: string

  /** Handler function that executes the action */
  handler: ActionHandler

  /** Permission required to execute this action */
  permission: string
}
