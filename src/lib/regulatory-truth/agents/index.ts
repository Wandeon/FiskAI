// src/lib/regulatory-truth/agents/index.ts

export { runAgent, type AgentRunOptions, type AgentRunResult } from "./runner"
export { runSentinel, type SentinelResult } from "./sentinel"
export { runExtractor, runExtractorBatch, type ExtractorResult } from "./extractor"
export {
  runComposer,
  runComposerBatch,
  groupSourcePointersByDomain,
  type ComposerResult,
} from "./composer"
export { runReviewer, type ReviewerResult } from "./reviewer"
export { runReleaser, type ReleaserResult } from "./releaser"
export { runArbiter, runArbiterBatch, getPendingConflicts, type ArbiterResult } from "./arbiter"

// Content classification
export { classifyContent, getExtractorsForType } from "./content-classifier"
export type { ClassificationResult } from "./content-classifier"

// Shape-specific extractors
export { runClaimExtractor } from "./claim-extractor"
export type { ClaimExtractionResult } from "./claim-extractor"

export { runProcessExtractor } from "./process-extractor"
export type { ProcessExtractionResult } from "./process-extractor"

export { runReferenceExtractor } from "./reference-extractor"
export type { ReferenceExtractionResult } from "./reference-extractor"

export { runAssetExtractor } from "./asset-extractor"
export type { AssetExtractionResult } from "./asset-extractor"

export { runTransitionalExtractor } from "./transitional-extractor"
export type { TransitionalExtractionResult } from "./transitional-extractor"

export {
  detectComparisonContent,
  extractComparisonMatrix,
  saveComparisonMatrix,
  runComparisonExtractor,
} from "./comparison-extractor"
export type { ExtractionResult, ComparisonExtractionResult } from "./comparison-extractor"

// Multi-shape orchestrator
export { runMultiShapeExtraction } from "./multi-shape-extractor"
export type { MultiShapeExtractionResult } from "./multi-shape-extractor"
