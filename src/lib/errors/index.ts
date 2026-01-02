/**
 * Errors Module
 *
 * Standardized, machine-readable error handling.
 *
 * @module errors
 * @since Enterprise Hardening - Error Taxonomy
 */

export {
  // Types
  type ErrorDomain,
  type ErrorCode,
  type MachineReadableError,

  // Error classes
  ApplicationError,
  PeriodError,
  EntityError,
  ValidationError,

  // Utilities
  ERROR_METADATA,
  toMachineReadableError,
} from "./taxonomy"
