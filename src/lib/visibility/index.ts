// src/lib/visibility/index.ts
// Public exports for the visibility system
// NOTE: This file only exports client-safe code (no database/server dependencies)
// For server utilities, import directly from "./server" or "./route-protection"

// Elements
export {
  VISIBILITY_ELEMENTS,
  type ElementId,
  type ElementType,
  getElement,
  getElementsByType,
} from "./elements"

// Rules (pure functions, no database)
export {
  type CompetenceLevel,
  type ProgressionStage,
  COMPETENCE_LABELS,
  STAGE_ORDER,
  STAGE_LABELS,
  STAGE_ICONS,
  BUSINESS_TYPE_HIDDEN,
  PROGRESSION_LOCKED,
  COMPETENCE_STARTING_STAGE,
  COMPETENCE_HIDDEN,
  calculateActualStage,
  getEffectiveStage,
  isHiddenByBusinessType,
  isHiddenByCompetence,
  isLockedByProgression,
  getUnlockHintForElement,
  getNextAction,
} from "./rules"

// Context (client-side)
export {
  VisibilityProvider,
  useVisibility,
  useVisibilityOptional,
  type VisibilityProviderProps,
  type VisibilityState,
  type VisibilityContextValue,
} from "./context"

// Components (client-side)
export {
  Visible,
  VisibleNavItem,
  VisibleButton,
  VisibleLink,
  useElementStatus,
  type VisibleProps,
  type VisibleNavItemProps,
  type VisibleButtonProps,
  type VisibleLinkProps,
} from "./components"

// NOTE: Server utilities are NOT exported here to prevent client-side bundling
// Import server utilities directly:
//   import { getServerVisibility, checkRouteAccess } from "@/lib/visibility/server"
//   import { protectRoute } from "@/lib/visibility/route-protection"
