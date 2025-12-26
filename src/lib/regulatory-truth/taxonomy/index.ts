// src/lib/regulatory-truth/taxonomy/index.ts

// Concept graph traversal
export {
  getConceptWithRelations,
  getAncestors,
  getDescendants,
  findConceptsByTerm,
  getLegalCategoryChain,
  type ConceptWithRelations,
} from "./concept-graph"

// Query expansion
export {
  expandQueryConcepts,
  findRulesByLegalCategory,
  findVatCategoryForTerm,
  type ExpandedQuery,
} from "./query-expansion"

// Taxonomy seeding
export { seedTaxonomy } from "./seed-taxonomy"

// Precedence
export {
  buildOverridesEdges,
  findOverridingRules,
  findOverriddenRules,
  doesOverride,
} from "./precedence-builder"
