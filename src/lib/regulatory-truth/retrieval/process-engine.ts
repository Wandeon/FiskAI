// src/lib/regulatory-truth/retrieval/process-engine.ts
import { db } from "@/lib/db"
import { expandQueryConcepts } from "../taxonomy/query-expansion"

export interface ProcessEngineResult {
  success: boolean
  process: {
    id: string
    slug: string
    titleHr: string
    processType: string
    estimatedTime: string | null
    prerequisites: unknown
  } | null
  steps: Array<{
    orderNum: number
    actionHr: string
    requiresAssets: string[]
    isOptional: boolean
  }>
  relatedAssets: Array<{
    id: string
    formCode: string | null
    officialName: string
    downloadUrl: string
  }>
  reasoning: string
}

/**
 * Process Engine - handles "how do I" workflow queries
 *
 * Examples:
 * - "How do I register for OSS?"
 * - "What are the steps to file VAT return?"
 * - "Kako prijaviti PDV?"
 */
export async function runProcessEngine(
  query: string,
  entities: { subjects: string[]; formCodes: string[] }
): Promise<ProcessEngineResult> {
  const result: ProcessEngineResult = {
    success: false,
    process: null,
    steps: [],
    relatedAssets: [],
    reasoning: "",
  }

  // Step 1: Expand query
  const expanded = await expandQueryConcepts(query)

  // Step 2: Build search conditions
  const queryLower = query.toLowerCase()

  // Detect process type from query keywords
  const processTypeConditions: Array<{
    processType: "REGISTRATION" | "FILING" | "APPEAL" | "CLOSURE" | "AMENDMENT" | "INQUIRY"
  }> = []

  if (
    queryLower.includes("registracija") ||
    queryLower.includes("register") ||
    queryLower.includes("prijava za")
  ) {
    processTypeConditions.push({ processType: "REGISTRATION" })
  }
  if (
    queryLower.includes("prijava") ||
    queryLower.includes("file") ||
    queryLower.includes("podnijeti") ||
    queryLower.includes("filing")
  ) {
    processTypeConditions.push({ processType: "FILING" })
  }
  if (
    queryLower.includes("žalba") ||
    queryLower.includes("appeal") ||
    queryLower.includes("prigovor")
  ) {
    processTypeConditions.push({ processType: "APPEAL" })
  }
  if (
    queryLower.includes("zatvaranje") ||
    queryLower.includes("closure") ||
    queryLower.includes("odjava")
  ) {
    processTypeConditions.push({ processType: "CLOSURE" })
  }
  if (
    queryLower.includes("izmjena") ||
    queryLower.includes("amendment") ||
    queryLower.includes("promjena")
  ) {
    processTypeConditions.push({ processType: "AMENDMENT" })
  }
  if (
    queryLower.includes("upit") ||
    queryLower.includes("inquiry") ||
    queryLower.includes("pitanje")
  ) {
    processTypeConditions.push({ processType: "INQUIRY" })
  }

  // Step 3: Search for matching processes
  const processes = await db.regulatoryProcess.findMany({
    where: {
      OR: [
        // Match by title (Croatian)
        {
          titleHr: {
            contains: expanded.originalTerms[0] ?? "",
            mode: "insensitive",
          },
        },
        // Match by title (English)
        {
          titleEn: {
            contains: expanded.originalTerms[0] ?? "",
            mode: "insensitive",
          },
        },
        // Match by slug from taxonomy concepts
        {
          slug: {
            in: expanded.matchedConcepts.length > 0 ? expanded.matchedConcepts : ["__no_match__"],
          },
        },
        // Match by process type keywords
        ...processTypeConditions,
      ],
    },
    include: {
      steps: {
        orderBy: { orderNum: "asc" },
      },
      assets: true,
    },
    take: 5,
  })

  if (processes.length === 0) {
    result.reasoning = `No matching processes found for query: "${query}". Expanded terms: ${expanded.expandedTerms.join(", ")}`
    return result
  }

  // Step 4: Score and select best matching process
  // Prefer processes that match more query terms
  const scoredProcesses = processes.map((process) => {
    let score = 0
    const titleLower = process.titleHr.toLowerCase()
    const titleEnLower = (process.titleEn ?? "").toLowerCase()

    // Score based on term matches in title
    for (const term of expanded.expandedTerms) {
      if (titleLower.includes(term)) score += 2
      if (titleEnLower.includes(term)) score += 1
    }

    // Score based on process type match
    for (const condition of processTypeConditions) {
      if (process.processType === condition.processType) score += 3
    }

    return { process, score }
  })

  // Sort by score descending
  scoredProcesses.sort((a, b) => b.score - a.score)
  const bestMatch = scoredProcesses[0]
  const process = bestMatch.process

  // Step 5: Build result
  result.process = {
    id: process.id,
    slug: process.slug,
    titleHr: process.titleHr,
    processType: process.processType,
    estimatedTime: process.estimatedTime,
    prerequisites: process.prerequisites,
  }

  result.steps = process.steps.map((step) => ({
    orderNum: step.orderNum,
    actionHr: step.actionHr,
    requiresAssets: step.requiresAssets,
    // A step is optional if it has branching (success/failure paths)
    isOptional: step.onSuccessStepId !== null && step.onFailureStepId !== null,
  }))

  result.relatedAssets = process.assets.map((asset) => ({
    id: asset.id,
    formCode: asset.formCode,
    officialName: asset.officialName,
    downloadUrl: asset.downloadUrl,
  }))

  result.success = true
  result.reasoning = `Found process: "${process.titleHr}" (${process.processType}) with ${process.steps.length} step(s). Match score: ${bestMatch.score}`

  return result
}
