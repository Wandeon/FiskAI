// src/lib/regulatory-truth/watchdog/predictive-alerts.ts
//
// Predictive Alerting - RTL Self-Improvement (Priority 3A)
//
// Purpose: Predict threshold breaches BEFORE they happen using linear regression.
// Instead of alerting when a threshold is exceeded, this module predicts when
// metrics WILL exceed thresholds based on historical trends.
//
// Key Metrics:
// - DLQ growth rate → predict "DLQ full in X hours"
// - Rejection rate trend → predict "will exceed 35% in X hours"
// - Source scrape failures → predict "source will be stale by X"
//
// Alert Types:
// - TRENDING_CRITICAL: Will breach in <4 hours
// - TRENDING_WARNING: Will breach in <24 hours

import { db, dbReg } from "@/lib/db"
import { deadletterQueue, allQueues } from "../workers"
import { raiseAlert } from "./alerting"
import { getThreshold } from "./types"

/**
 * Minimum data points required for meaningful prediction
 */
const MIN_DATA_POINTS = 5

/**
 * Prediction thresholds (hours until breach)
 */
const PREDICTION_THRESHOLDS = {
  CRITICAL: 4, // hours
  WARNING: 24, // hours
} as const

/**
 * Data point for time-series analysis
 */
interface TimeSeriesPoint {
  timestamp: Date
  value: number
}

/**
 * Linear regression result
 */
interface RegressionResult {
  slope: number // Change per millisecond
  intercept: number
  r2: number // Coefficient of determination
  slopePerHour: number // More readable slope
}

/**
 * Prediction result
 */
interface PredictionResult {
  metric: string
  currentValue: number
  threshold: number
  trend: "INCREASING" | "STABLE" | "DECREASING"
  hoursUntilBreach: number | null // null if won't breach or decreasing
  confidence: number // R² value
  prediction: "CRITICAL" | "WARNING" | "OK"
  message: string
}

/**
 * Simple linear regression using least squares method.
 * Returns slope (change per ms), intercept, and R² value.
 */
function linearRegression(points: TimeSeriesPoint[]): RegressionResult | null {
  if (points.length < MIN_DATA_POINTS) {
    return null
  }

  const n = points.length
  const xs = points.map((p) => p.timestamp.getTime())
  const ys = points.map((p) => p.value)

  // Calculate means
  const xMean = xs.reduce((a, b) => a + b, 0) / n
  const yMean = ys.reduce((a, b) => a + b, 0) / n

  // Calculate slope and intercept
  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (ys[i] - yMean)
    denominator += (xs[i] - xMean) ** 2
  }

  if (denominator === 0) {
    return null // Vertical line or single x value
  }

  const slope = numerator / denominator
  const intercept = yMean - slope * xMean

  // Calculate R² (coefficient of determination)
  let ssRes = 0
  let ssTot = 0

  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept
    ssRes += (ys[i] - predicted) ** 2
    ssTot += (ys[i] - yMean) ** 2
  }

  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  return {
    slope,
    intercept,
    r2,
    slopePerHour: slope * 60 * 60 * 1000, // Convert to per-hour
  }
}

/**
 * Predict when a metric will reach a threshold.
 * Returns hours until breach, or null if won't breach.
 */
function predictTimeToThreshold(
  regression: RegressionResult,
  currentValue: number,
  threshold: number
): number | null {
  // If slope is zero or negative (decreasing), won't breach
  if (regression.slope <= 0) {
    return null
  }

  // Calculate time to threshold
  // threshold = slope * t + intercept
  // t = (threshold - intercept) / slope
  const now = Date.now()
  const currentPredicted = regression.slope * now + regression.intercept

  // If already above threshold
  if (currentValue >= threshold) {
    return 0
  }

  // Calculate time to breach in milliseconds
  const timeToBreachMs = (threshold - currentPredicted) / regression.slope

  // If breach is in the past, we're already in trouble
  if (timeToBreachMs < 0) {
    return 0
  }

  // Convert to hours
  return timeToBreachMs / (60 * 60 * 1000)
}

/**
 * Collect DLQ depth history from watchdog health records.
 * Falls back to current depth if no history.
 */
async function collectDLQHistory(): Promise<TimeSeriesPoint[]> {
  const points: TimeSeriesPoint[] = []

  // Get historical DLQ depth from watchdog health checks
  const healthRecords = await db.watchdogHealth.findMany({
    where: {
      checkType: "REJECTION_RATE", // DLQ is tracked under this type
      entityId: "dead-letter-queue",
    },
    orderBy: { lastChecked: "desc" },
    take: 50,
    select: {
      metric: true,
      lastChecked: true,
    },
  })

  for (const record of healthRecords) {
    if (record.metric !== null && record.lastChecked) {
      points.push({
        timestamp: record.lastChecked,
        value: record.metric,
      })
    }
  }

  // Always add current state
  try {
    const counts = await deadletterQueue.getJobCounts("waiting", "failed")
    points.unshift({
      timestamp: new Date(),
      value: counts.waiting + counts.failed,
    })
  } catch {
    // Queue might not be available
  }

  return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

/**
 * Collect rejection rate history.
 */
async function collectRejectionRateHistory(): Promise<TimeSeriesPoint[]> {
  const points: TimeSeriesPoint[] = []

  // Get historical rejection rates
  const healthRecords = await db.watchdogHealth.findMany({
    where: {
      checkType: "REJECTION_RATE",
      entityId: "global",
    },
    orderBy: { lastChecked: "desc" },
    take: 50,
    select: {
      metric: true,
      lastChecked: true,
    },
  })

  for (const record of healthRecords) {
    if (record.metric !== null && record.lastChecked) {
      points.push({
        timestamp: record.lastChecked,
        value: record.metric,
      })
    }
  }

  // Add current state
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [approved, rejected] = await Promise.all([
    db.regulatoryRule.count({
      where: { status: "APPROVED", updatedAt: { gte: cutoff } },
    }),
    db.regulatoryRule.count({
      where: { status: "REJECTED", updatedAt: { gte: cutoff } },
    }),
  ])

  const total = approved + rejected
  if (total > 0) {
    points.unshift({
      timestamp: new Date(),
      value: rejected / total,
    })
  }

  return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

/**
 * Collect source staleness for a specific source.
 */
async function collectSourceStalenessHistory(sourceId: string): Promise<TimeSeriesPoint[]> {
  const points: TimeSeriesPoint[] = []

  // Get evidence fetch history for this source
  const evidenceRecords = await dbReg.evidence.findMany({
    where: { sourceId },
    orderBy: { fetchedAt: "desc" },
    take: 50,
    select: { fetchedAt: true },
  })

  // Convert to "days since last fetch" at each point
  for (let i = 0; i < evidenceRecords.length - 1; i++) {
    const current = evidenceRecords[i].fetchedAt
    const next = evidenceRecords[i + 1].fetchedAt
    const daysSinceNext = (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24)

    points.push({
      timestamp: current,
      value: daysSinceNext,
    })
  }

  // Add current staleness
  if (evidenceRecords.length > 0) {
    const lastFetch = evidenceRecords[0].fetchedAt
    const daysSinceLast = (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60 * 24)
    points.unshift({
      timestamp: new Date(),
      value: daysSinceLast,
    })
  }

  return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

/**
 * Collect queue backlog history.
 */
async function collectQueueBacklogHistory(): Promise<TimeSeriesPoint[]> {
  const points: TimeSeriesPoint[] = []

  // Get historical queue backlog
  const healthRecords = await db.watchdogHealth.findMany({
    where: {
      checkType: "PIPELINE_HEALTH",
      entityId: "queue-backlog",
    },
    orderBy: { lastChecked: "desc" },
    take: 50,
    select: {
      metric: true,
      lastChecked: true,
    },
  })

  for (const record of healthRecords) {
    if (record.metric !== null && record.lastChecked) {
      points.push({
        timestamp: record.lastChecked,
        value: record.metric,
      })
    }
  }

  // Add current state
  let maxBacklog = 0
  for (const queue of Object.values(allQueues)) {
    try {
      const counts = await queue.getJobCounts("waiting")
      maxBacklog = Math.max(maxBacklog, counts.waiting)
    } catch {
      // Queue might not be available
    }
  }

  points.unshift({
    timestamp: new Date(),
    value: maxBacklog,
  })

  return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

/**
 * Analyze a metric and predict breach.
 */
function analyzeMetric(
  name: string,
  points: TimeSeriesPoint[],
  threshold: number,
  isHigherBad: boolean = true
): PredictionResult {
  const currentValue = points.length > 0 ? points[points.length - 1].value : 0

  if (points.length < MIN_DATA_POINTS) {
    return {
      metric: name,
      currentValue,
      threshold,
      trend: "STABLE",
      hoursUntilBreach: null,
      confidence: 0,
      prediction: "OK",
      message: `Insufficient data for ${name} prediction (${points.length}/${MIN_DATA_POINTS} points)`,
    }
  }

  const regression = linearRegression(points)

  if (!regression) {
    return {
      metric: name,
      currentValue,
      threshold,
      trend: "STABLE",
      hoursUntilBreach: null,
      confidence: 0,
      prediction: "OK",
      message: `Could not compute regression for ${name}`,
    }
  }

  // Determine trend
  let trend: "INCREASING" | "STABLE" | "DECREASING" = "STABLE"

  // Consider "stable" if change is very small relative to threshold
  const significantChange = threshold * 0.01 // 1% of threshold per hour

  if (regression.slopePerHour > significantChange) {
    trend = "INCREASING"
  } else if (regression.slopePerHour < -significantChange) {
    trend = "DECREASING"
  }

  // For metrics where lower is bad (like confidence), flip the logic
  if (!isHigherBad) {
    const hoursUntilBreach =
      regression.slope < 0
        ? predictTimeToThreshold(
            { ...regression, slope: -regression.slope },
            threshold - currentValue,
            0
          )
        : null

    let prediction: "CRITICAL" | "WARNING" | "OK" = "OK"
    let message = `${name} is ${trend.toLowerCase()}`

    if (hoursUntilBreach !== null) {
      if (hoursUntilBreach <= PREDICTION_THRESHOLDS.CRITICAL) {
        prediction = "CRITICAL"
        message = `${name} will breach ${threshold} in ~${hoursUntilBreach.toFixed(1)} hours`
      } else if (hoursUntilBreach <= PREDICTION_THRESHOLDS.WARNING) {
        prediction = "WARNING"
        message = `${name} trending toward threshold (${hoursUntilBreach.toFixed(1)} hours)`
      }
    }

    return {
      metric: name,
      currentValue,
      threshold,
      trend: trend === "INCREASING" ? "DECREASING" : trend === "DECREASING" ? "INCREASING" : trend,
      hoursUntilBreach,
      confidence: regression.r2,
      prediction,
      message,
    }
  }

  // Standard logic: higher is bad
  const hoursUntilBreach = predictTimeToThreshold(regression, currentValue, threshold)

  let prediction: "CRITICAL" | "WARNING" | "OK" = "OK"
  let message = `${name} is ${trend.toLowerCase()}`

  if (hoursUntilBreach !== null) {
    if (hoursUntilBreach <= PREDICTION_THRESHOLDS.CRITICAL) {
      prediction = "CRITICAL"
      message = `${name} will breach ${threshold} in ~${hoursUntilBreach.toFixed(1)} hours`
    } else if (hoursUntilBreach <= PREDICTION_THRESHOLDS.WARNING) {
      prediction = "WARNING"
      message = `${name} trending toward threshold (${hoursUntilBreach.toFixed(1)} hours)`
    }
  }

  return {
    metric: name,
    currentValue,
    threshold,
    trend,
    hoursUntilBreach,
    confidence: regression.r2,
    prediction,
    message,
  }
}

/**
 * Run predictive analysis on all key metrics.
 */
export async function runPredictiveAnalysis(): Promise<PredictionResult[]> {
  const results: PredictionResult[] = []

  console.log("[predictive-alerts] Running predictive analysis...")

  // 1. DLQ Growth
  const dlqHistory = await collectDLQHistory()
  const dlqThreshold = getThreshold("DLQ_CRITICAL")
  results.push(analyzeMetric("DLQ Depth", dlqHistory, dlqThreshold))

  // 2. Rejection Rate
  const rejectionHistory = await collectRejectionRateHistory()
  const rejectionThreshold = getThreshold("REJECTION_RATE_CRITICAL")
  results.push(analyzeMetric("Rejection Rate", rejectionHistory, rejectionThreshold))

  // 3. Queue Backlog
  const queueHistory = await collectQueueBacklogHistory()
  const backlogThreshold = getThreshold("QUEUE_BACKLOG_CRITICAL")
  results.push(analyzeMetric("Queue Backlog", queueHistory, backlogThreshold))

  // 4. Source Staleness (check top 5 active sources)
  const sources = await dbReg.regulatorySource.findMany({
    where: { isActive: true },
    take: 5,
    select: { id: true, name: true },
  })

  const stalenessThreshold = getThreshold("STALE_SOURCE_CRITICAL_DAYS")

  for (const source of sources) {
    const stalenessHistory = await collectSourceStalenessHistory(source.id)
    if (stalenessHistory.length >= MIN_DATA_POINTS) {
      results.push(
        analyzeMetric(`Source Staleness (${source.name})`, stalenessHistory, stalenessThreshold)
      )
    }
  }

  return results
}

/**
 * Run predictive analysis and raise alerts for concerning trends.
 */
export async function checkPredictiveAlerts(): Promise<void> {
  const results = await runPredictiveAnalysis()

  for (const result of results) {
    // Log all results
    console.log(
      `[predictive-alerts] ${result.metric}: ${result.message} ` +
        `(confidence: ${(result.confidence * 100).toFixed(1)}%, trend: ${result.trend})`
    )

    // Only alert if confidence is reasonable (R² > 0.5)
    if (result.confidence < 0.5) {
      continue
    }

    if (result.prediction === "CRITICAL") {
      await raiseAlert({
        severity: "CRITICAL",
        type: "TRENDING_CRITICAL" as never, // Type not in schema yet
        entityId: result.metric,
        message: result.message,
        details: {
          currentValue: result.currentValue,
          threshold: result.threshold,
          hoursUntilBreach: result.hoursUntilBreach,
          trend: result.trend,
          confidence: result.confidence,
        },
      })
    } else if (result.prediction === "WARNING") {
      await raiseAlert({
        severity: "WARNING",
        type: "TRENDING_WARNING" as never, // Type not in schema yet
        entityId: result.metric,
        message: result.message,
        details: {
          currentValue: result.currentValue,
          threshold: result.threshold,
          hoursUntilBreach: result.hoursUntilBreach,
          trend: result.trend,
          confidence: result.confidence,
        },
      })
    }
  }
}

/**
 * Get a summary of current trends for monitoring dashboard.
 */
export async function getPredictiveSummary(): Promise<{
  metrics: PredictionResult[]
  overallStatus: "OK" | "WARNING" | "CRITICAL"
  criticalCount: number
  warningCount: number
}> {
  const metrics = await runPredictiveAnalysis()

  const criticalCount = metrics.filter((m) => m.prediction === "CRITICAL").length
  const warningCount = metrics.filter((m) => m.prediction === "WARNING").length

  let overallStatus: "OK" | "WARNING" | "CRITICAL" = "OK"
  if (criticalCount > 0) {
    overallStatus = "CRITICAL"
  } else if (warningCount > 0) {
    overallStatus = "WARNING"
  }

  return {
    metrics,
    overallStatus,
    criticalCount,
    warningCount,
  }
}

/**
 * Calculate moving average for smoothing noisy data.
 * Used internally for preprocessing before regression.
 */
export function movingAverage(points: TimeSeriesPoint[], windowSize: number): TimeSeriesPoint[] {
  if (points.length < windowSize) {
    return points
  }

  const result: TimeSeriesPoint[] = []

  for (let i = windowSize - 1; i < points.length; i++) {
    const window = points.slice(i - windowSize + 1, i + 1)
    const avgValue = window.reduce((sum, p) => sum + p.value, 0) / windowSize
    result.push({
      timestamp: points[i].timestamp,
      value: avgValue,
    })
  }

  return result
}
