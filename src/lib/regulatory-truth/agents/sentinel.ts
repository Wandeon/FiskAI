// src/lib/regulatory-truth/agents/sentinel.ts

import { createHash } from "crypto"
import { db } from "@/lib/db"

// =============================================================================
// FETCH HELPERS
// =============================================================================

async function fetchSourceContent(url: string): Promise<{
  content: string
  contentType: "html" | "pdf" | "xml"
}> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "FiskAI-Sentinel/1.0 (regulatory monitoring)",
      Accept: "text/html,application/xhtml+xml,application/xml,application/pdf",
      "Accept-Language": "hr-HR,hr;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const contentTypeHeader = response.headers.get("content-type") || ""
  let contentType: "html" | "pdf" | "xml" = "html"

  if (contentTypeHeader.includes("pdf")) {
    contentType = "pdf"
  } else if (contentTypeHeader.includes("xml")) {
    contentType = "xml"
  }

  const text = await response.text()

  // Basic HTML cleanup
  const content = text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()

  return { content, contentType }
}

function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

// =============================================================================
// SENTINEL AGENT
// =============================================================================

export interface SentinelResult {
  success: boolean
  evidenceId: string | null
  hasChanged: boolean
  error: string | null
}

/**
 * Run the Sentinel to monitor a regulatory source
 * Note: This is a simplified version that just fetches and stores evidence.
 * The LLM-based analysis is deferred to the Extractor agent.
 */
export async function runSentinel(sourceId: string): Promise<SentinelResult> {
  // Get source from database
  const source = await db.regulatorySource.findUnique({
    where: { id: sourceId },
  })

  if (!source) {
    return {
      success: false,
      evidenceId: null,
      hasChanged: false,
      error: `Source not found: ${sourceId}`,
    }
  }

  try {
    // Fetch the source content
    const { content, contentType } = await fetchSourceContent(source.url)
    const contentHash = computeContentHash(content)
    const hasChanged = source.lastContentHash !== contentHash

    // Store evidence
    const evidence = await db.evidence.create({
      data: {
        sourceId: source.id,
        contentHash,
        rawContent: content,
        contentType,
        url: source.url,
        hasChanged,
        changeSummary: hasChanged ? "Content changed since last fetch" : null,
      },
    })

    // Update source last checked
    await db.regulatorySource.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        lastContentHash: contentHash,
      },
    })

    return {
      success: true,
      evidenceId: evidence.id,
      hasChanged,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      evidenceId: null,
      hasChanged: false,
      error: `Sentinel error: ${error}`,
    }
  }
}
