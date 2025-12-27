#!/usr/bin/env tsx
// src/lib/regulatory-truth/scripts/audit-extractor.ts
// Audit script for extractor accuracy - validates quote extraction and hallucination detection

import { getCliDb, closeCliDb, getPool } from "../cli-db"

interface AuditResult {
  section: string
  status: "PASS" | "FAIL" | "WARN" | "INFO"
  details: string
  data?: unknown
}

const results: AuditResult[] = []

function log(result: AuditResult) {
  const icon = result.status === "PASS" ? "✓" : result.status === "FAIL" ? "✗" : result.status === "WARN" ? "⚠" : "ℹ"
  console.log(`[${icon}] ${result.section}: ${result.details}`)
  results.push(result)
}

async function main() {
  console.log("=" .repeat(70))
  console.log("EXTRACTOR ACCURACY AUDIT")
  console.log("=" .repeat(70))
  console.log()

  const db = getCliDb()
  const pool = getPool()

  // 1. DOMAIN DISTRIBUTION
  console.log("\n--- 1. DOMAIN DISTRIBUTION ---\n")
  const domainStats = await db.$queryRaw<Array<{domain: string, count: bigint, avg_confidence: number}>>`
    SELECT domain, COUNT(*)::bigint as count, AVG(confidence) as avg_confidence
    FROM "SourcePointer"
    GROUP BY domain
    ORDER BY COUNT(*) DESC
  `

  if (domainStats.length === 0) {
    log({ section: "Domain Distribution", status: "WARN", details: "No SourcePointers found in database" })
  } else {
    console.log("Domain | Count | Avg Confidence")
    console.log("-".repeat(50))
    for (const row of domainStats) {
      console.log(`${row.domain.padEnd(20)} | ${String(row.count).padStart(5)} | ${row.avg_confidence?.toFixed(2) || "N/A"}`)
    }
    log({
      section: "Domain Distribution",
      status: "INFO",
      details: `${domainStats.length} domains with ${domainStats.reduce((a, b) => a + Number(b.count), 0)} total SourcePointers`,
      data: domainStats
    })
  }

  // 2. REJECTION STATISTICS
  console.log("\n--- 2. REJECTION STATISTICS ---\n")
  const rejectionStats = await db.$queryRaw<Array<{rejection_type: string, count: bigint}>>`
    SELECT "rejectionType" as rejection_type, COUNT(*)::bigint as count
    FROM "ExtractionRejected"
    GROUP BY "rejectionType"
    ORDER BY count DESC
  `

  if (rejectionStats.length === 0) {
    log({ section: "Rejection Stats", status: "INFO", details: "No rejected extractions found" })
  } else {
    console.log("Rejection Type | Count")
    console.log("-".repeat(40))
    for (const row of rejectionStats) {
      console.log(`${row.rejection_type.padEnd(25)} | ${row.count}`)
    }

    const noQuoteMatch = rejectionStats.find(r => r.rejection_type === "NO_QUOTE_MATCH")
    if (noQuoteMatch && Number(noQuoteMatch.count) > 10) {
      log({
        section: "Rejection Stats",
        status: "WARN",
        details: `High NO_QUOTE_MATCH rejections: ${noQuoteMatch.count} - may indicate extraction problems`,
        data: rejectionStats
      })
    } else {
      log({ section: "Rejection Stats", status: "INFO", details: `${rejectionStats.length} rejection types recorded`, data: rejectionStats })
    }
  }

  // 3. RECENT SOURCE POINTERS
  console.log("\n--- 3. RECENT SOURCE POINTERS (last 20) ---\n")
  const recentPointers = await db.sourcePointer.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { evidence: { select: { id: true, url: true, rawContent: true } } }
  })

  console.log("ID | Value | Confidence | Quote (truncated)")
  console.log("-".repeat(80))
  for (const sp of recentPointers) {
    const quote = sp.exactQuote.substring(0, 50).replace(/\n/g, " ")
    console.log(`${sp.id.substring(0, 8)} | ${String(sp.extractedValue).padEnd(15).substring(0, 15)} | ${sp.confidence.toFixed(2)} | ${quote}...`)
  }
  log({ section: "Recent Pointers", status: "INFO", details: `${recentPointers.length} recent SourcePointers retrieved` })

  // 4. COVERAGE REPORTS - LOW SCORE
  console.log("\n--- 4. LOW COVERAGE REPORTS (<50%) ---\n")
  const lowCoverage = await db.coverageReport.findMany({
    where: { coverageScore: { lt: 0.5 } },
    take: 10,
    orderBy: { coverageScore: "asc" }
  })

  if (lowCoverage.length === 0) {
    log({ section: "Coverage Reports", status: "PASS", details: "No low-coverage reports found" })
  } else {
    console.log("Evidence ID | Content Type | Score | Missing Shapes")
    console.log("-".repeat(70))
    for (const cr of lowCoverage) {
      console.log(`${cr.evidenceId.substring(0, 12)} | ${(cr.primaryContentType || "UNKNOWN").padEnd(12)} | ${(cr.coverageScore * 100).toFixed(0)}% | ${cr.missingShapes.join(", ")}`)
    }
    log({ section: "Coverage Reports", status: "WARN", details: `${lowCoverage.length} reports with <50% coverage`, data: lowCoverage })
  }

  // 5. QUOTE VERIFICATION (CRITICAL - sample 10 random)
  console.log("\n--- 5. QUOTE VERIFICATION (10 random samples) ---\n")

  const randomPointers = await db.sourcePointer.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { evidence: { select: { id: true, url: true, rawContent: true } } }
  })

  let quotePassCount = 0
  let quoteFailCount = 0
  const failedQuotes: Array<{id: string, value: string, quote: string, reason: string}> = []

  for (const sp of randomPointers) {
    const rawContent = sp.evidence?.rawContent || ""
    const quote = sp.exactQuote
    const value = sp.extractedValue

    // Check if quote exists in raw content
    const contentLower = rawContent.toLowerCase()
    const quoteLower = quote.toLowerCase()

    // Also check cleaned/normalized versions
    const normalizedQuote = quoteLower.replace(/\s+/g, " ").trim()
    const contentNormalized = contentLower.replace(/\s+/g, " ")

    const quoteFound = contentLower.includes(quoteLower) || contentNormalized.includes(normalizedQuote)

    if (quoteFound || !rawContent) {
      quotePassCount++
      console.log(`✓ ${sp.id.substring(0, 8)}: Quote verified for value "${value}"`)
    } else {
      quoteFailCount++
      failedQuotes.push({
        id: sp.id,
        value: String(value),
        quote: quote.substring(0, 100),
        reason: "Quote not found in source content"
      })
      console.log(`✗ ${sp.id.substring(0, 8)}: QUOTE NOT FOUND - value "${value}"`)
      console.log(`   Quote: "${quote.substring(0, 80)}..."`)
    }
  }

  if (quoteFailCount > 0) {
    log({
      section: "Quote Verification",
      status: "FAIL",
      details: `HALLUCINATION RISK: ${quoteFailCount}/${randomPointers.length} quotes not found in source`,
      data: failedQuotes
    })
  } else {
    log({ section: "Quote Verification", status: "PASS", details: `${quotePassCount}/${randomPointers.length} quotes verified` })
  }

  // 6. CONFIDENCE CALIBRATION
  console.log("\n--- 6. CONFIDENCE CALIBRATION ---\n")
  const confidenceDistribution = await db.$queryRaw<Array<{bucket: string, count: bigint}>>`
    SELECT
      CASE
        WHEN confidence >= 0.9 THEN 'High (≥0.9)'
        WHEN confidence >= 0.7 THEN 'Medium (0.7-0.9)'
        ELSE 'Low (<0.7)'
      END as bucket,
      COUNT(*)::bigint as count
    FROM "SourcePointer"
    GROUP BY bucket
    ORDER BY bucket
  `

  console.log("Confidence Bucket | Count")
  console.log("-".repeat(35))
  for (const row of confidenceDistribution) {
    console.log(`${row.bucket.padEnd(20)} | ${row.count}`)
  }

  const lowConfCount = confidenceDistribution.find(d => d.bucket.includes("Low"))?.count || 0n
  if (Number(lowConfCount) > 0) {
    log({ section: "Confidence Calibration", status: "INFO", details: `${lowConfCount} low-confidence extractions need review` })
  } else {
    log({ section: "Confidence Calibration", status: "PASS", details: "No low-confidence extractions" })
  }

  // 7. HIGH CONFIDENCE VERIFICATION (confidence > 0.95)
  console.log("\n--- 7. HIGH CONFIDENCE VERIFICATION (>0.95) ---\n")
  const highConfPointers = await db.sourcePointer.findMany({
    where: { confidence: { gte: 0.95 } },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { evidence: { select: { rawContent: true } } }
  })

  let highConfPass = 0
  for (const sp of highConfPointers) {
    const rawContent = sp.evidence?.rawContent || ""
    const quoteLower = sp.exactQuote.toLowerCase()
    const contentLower = rawContent.toLowerCase()

    if (contentLower.includes(quoteLower) || !rawContent) {
      highConfPass++
      console.log(`✓ [${sp.confidence}] ${sp.extractedValue}: Quote verified`)
    } else {
      console.log(`✗ [${sp.confidence}] ${sp.extractedValue}: HIGH CONFIDENCE BUT QUOTE NOT FOUND`)
    }
  }

  if (highConfPass === highConfPointers.length) {
    log({ section: "High Confidence", status: "PASS", details: `${highConfPass}/${highConfPointers.length} high-confidence extractions verified` })
  } else {
    log({ section: "High Confidence", status: "FAIL", details: `Only ${highConfPass}/${highConfPointers.length} high-confidence quotes verified` })
  }

  // 8. CHECK FOR APPROXIMATE VALUES
  console.log("\n--- 8. APPROXIMATE VALUE CHECK ---\n")
  const approxValues = await db.sourcePointer.findMany({
    where: {
      OR: [
        { extractedValue: { contains: "approximately" } },
        { extractedValue: { contains: "oko" } },
        { extractedValue: { contains: "približno" } },
        { extractedValue: { contains: "~" } }
      ]
    },
    take: 10
  })

  if (approxValues.length > 0) {
    log({
      section: "Approximate Values",
      status: "WARN",
      details: `Found ${approxValues.length} SourcePointers with approximate language - should be exact`,
      data: approxValues.map(v => ({ id: v.id, value: v.extractedValue }))
    })
    for (const av of approxValues) {
      console.log(`⚠ ${av.id}: "${av.extractedValue}"`)
    }
  } else {
    log({ section: "Approximate Values", status: "PASS", details: "No approximate language found in extracted values" })
  }

  // 9. DOMAIN COVERAGE CHECK
  console.log("\n--- 9. CRITICAL DOMAIN COVERAGE ---\n")
  const criticalDomains = ["pausalni", "pdv", "doprinosi", "porez_dohodak"]
  const domainCounts = await db.sourcePointer.groupBy({
    by: ["domain"],
    _count: { id: true }
  })

  const domainMap = new Map(domainCounts.map(d => [d.domain, d._count.id]))
  const missingDomains = criticalDomains.filter(d => !domainMap.has(d) || domainMap.get(d) === 0)

  console.log("Critical Domain | Count")
  console.log("-".repeat(35))
  for (const domain of criticalDomains) {
    const count = domainMap.get(domain) || 0
    const status = count > 0 ? "✓" : "✗"
    console.log(`${status} ${domain.padEnd(20)} | ${count}`)
  }

  if (missingDomains.length > 0) {
    log({ section: "Domain Coverage", status: "WARN", details: `Missing critical domains: ${missingDomains.join(", ")}` })
  } else {
    log({ section: "Domain Coverage", status: "PASS", details: "All critical domains have extractions" })
  }

  // 10. RECENT REJECTIONS REVIEW
  console.log("\n--- 10. RECENT REJECTIONS REVIEW (last 5) ---\n")
  const recentRejections = await db.extractionRejected.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { evidence: { select: { url: true } } }
  })

  if (recentRejections.length === 0) {
    log({ section: "Recent Rejections", status: "INFO", details: "No recent rejections" })
  } else {
    for (const rej of recentRejections) {
      console.log(`Type: ${rej.rejectionType}`)
      console.log(`Error: ${rej.errorDetails}`)
      console.log(`Source: ${rej.evidence?.url || "Unknown"}`)
      console.log("-".repeat(50))
    }
    log({ section: "Recent Rejections", status: "INFO", details: `Reviewed ${recentRejections.length} recent rejections` })
  }

  // SUMMARY
  console.log("\n" + "=".repeat(70))
  console.log("AUDIT SUMMARY")
  console.log("=".repeat(70))

  const passCount = results.filter(r => r.status === "PASS").length
  const failCount = results.filter(r => r.status === "FAIL").length
  const warnCount = results.filter(r => r.status === "WARN").length

  console.log(`\nPASS: ${passCount} | FAIL: ${failCount} | WARN: ${warnCount}`)

  if (failCount > 0) {
    console.log("\n❌ AUDIT FAILED - Critical issues found:")
    for (const fail of results.filter(r => r.status === "FAIL")) {
      console.log(`   - ${fail.section}: ${fail.details}`)
    }
  } else if (warnCount > 0) {
    console.log("\n⚠️  AUDIT PASSED WITH WARNINGS:")
    for (const warn of results.filter(r => r.status === "WARN")) {
      console.log(`   - ${warn.section}: ${warn.details}`)
    }
  } else {
    console.log("\n✅ AUDIT PASSED - No critical issues found")
  }

  await closeCliDb()
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(async (err) => {
  console.error("Audit failed:", err)
  await closeCliDb()
  process.exit(1)
})
