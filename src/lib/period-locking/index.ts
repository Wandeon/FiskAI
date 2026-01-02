/**
 * Period Locking Module
 *
 * Enterprise-grade accounting period lock enforcement for FiskAI.
 *
 * This module provides:
 * - PERIOD_AFFECTING_ENTITIES: Authoritative list of entities subject to period locks
 * - assertPeriodWritable(): Guard function to enforce period locks
 * - checkPeriodWritable(): Non-throwing check for capability resolution
 *
 * @module period-locking
 * @since Enterprise Hardening - P0 Integrity Fixes
 */

// Entity registry
export {
  PERIOD_AFFECTING_ENTITIES,
  PERIOD_AFFECTING_ENTITIES_BY_MODEL,
  PERIOD_AFFECTING_MODEL_NAMES,
  DIRECT_PERIOD_AFFECTING_ENTITIES,
  DERIVED_PERIOD_AFFECTING_ENTITIES,
  LOCKED_PERIOD_STATUSES,
  WRITABLE_PERIOD_STATUSES,
  getEntityConfig,
  isPeriodAffectingModel,
  getEntitiesByDomain,
  type PeriodAffectingEntity,
  type EntityType,
  type DateDerivationStrategy,
} from "./period-affecting-entities"

// Enforcement guards
export {
  assertPeriodWritable,
  assertPeriodWritableBulk,
  checkPeriodWritable,
  AccountingPeriodLockedError,
  type PeriodLockOperation,
  type PeriodLockContext,
  type PeriodLockResult,
} from "./period-lock-guard"
