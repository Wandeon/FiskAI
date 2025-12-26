// src/lib/regulatory-truth/quality/index.ts

// Coverage report
export {
  generateCoverageReport,
  saveCoverageReport,
  getCoverageSummary,
  type CoverageMetrics,
} from "./coverage-report"

// Coverage gate
export {
  runCoverageGate,
  canPublish,
  approveForPublication,
  rejectCoverage,
  type GateResult,
} from "./coverage-gate"
