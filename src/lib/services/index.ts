// src/lib/services/index.ts

/**
 * Services Index
 *
 * Central export point for all service facades.
 */

export {
  RegulatoryCalendarService,
  regulatoryCalendarService,
  type ContributionType,
  type DeadlineType,
  type VatRateType,
  type ContributionInfo,
  type MonthlyContributionsResult,
  type DeadlineResult,
} from "./regulatory-calendar.service"

export {
  TokenResolver,
  tokenResolver,
  type TokenContext,
  type TokenCompany,
  type TokenUser,
} from "./token-resolver.service"
