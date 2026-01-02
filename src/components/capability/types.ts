// src/components/capability/types.ts
/**
 * Capability UI Component Types
 *
 * Types for capability-aware UI components.
 * These components render capability state - they do not determine it.
 *
 * @module components/capability
 * @since Control Center Shells
 */

import type {
  CapabilityState,
  CapabilityResponse,
  CapabilityBlocker,
  CapabilityAction,
} from "@/lib/capabilities"

export type { CapabilityState, CapabilityResponse, CapabilityBlocker, CapabilityAction }

/**
 * Props for components that render capability state.
 */
export interface CapabilityStateProps {
  /** The resolved capability response */
  resolution: CapabilityResponse
}

/**
 * Props for components that render blockers.
 */
export interface BlockerDisplayProps {
  /** Blockers to display */
  blockers: CapabilityBlocker[]
  /** Whether to show resolution hints */
  showResolution?: boolean
}

/**
 * Props for capability-driven action buttons.
 */
export interface ActionButtonProps {
  /** The action to render */
  action: CapabilityAction
  /** Capability ID for diagnostics */
  capabilityId: string
  /** Click handler - only called if action is enabled */
  onClick?: () => void
  /** Show diagnostics overlay */
  showDiagnostics?: boolean
}

/**
 * Queue item with capability resolution.
 */
export interface QueueItem {
  /** Entity ID */
  id: string
  /** Entity type */
  type: string
  /** Display title */
  title: string
  /** Entity state/status */
  status: string
  /** When this item was created/modified */
  timestamp: string
  /** Resolved capabilities for this item */
  capabilities: CapabilityResponse[]
}

/**
 * Queue definition for Control Centers.
 */
export interface QueueDefinition {
  /** Queue identifier */
  id: string
  /** Queue display name */
  name: string
  /** Queue description */
  description: string
  /** Capability IDs relevant to this queue */
  capabilityIds: string[]
  /** Entity type this queue contains */
  entityType: string
}
