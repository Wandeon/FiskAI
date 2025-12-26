// src/lib/regulatory-truth/retrieval/reference-engine.ts
import { db } from "@/lib/db"
import { ReferenceCategory } from "@prisma/client"

export interface ReferenceEngineResult {
  success: boolean
  value: string | null
  table: {
    id: string
    category: string
    name: string
    keyColumn: string
    valueColumn: string
  } | null
  allEntries: Array<{
    key: string
    value: string
    metadata: unknown
  }>
  reasoning: string
}

/**
 * Reference Engine - handles exact lookup queries
 *
 * Examples:
 * - "What is the IBAN for Split?"
 * - "What is the CN code for software?"
 * - "Payment account for Zagreb tax office"
 */
export async function runReferenceEngine(
  query: string,
  entities: { locations: string[] }
): Promise<ReferenceEngineResult> {
  const result: ReferenceEngineResult = {
    success: false,
    value: null,
    table: null,
    allEntries: [],
    reasoning: "",
  }

  // Extract potential lookup keys from query
  const queryLower = query.toLowerCase()

  // Determine category from query
  let category: ReferenceCategory | null = null
  if (
    queryLower.includes("iban") ||
    queryLower.includes("račun") ||
    queryLower.includes("account")
  ) {
    category = ReferenceCategory.IBAN
  } else if (
    queryLower.includes("cn") ||
    queryLower.includes("tarif") ||
    queryLower.includes("code")
  ) {
    category = ReferenceCategory.CN_CODE
  } else if (
    queryLower.includes("ured") ||
    queryLower.includes("office") ||
    queryLower.includes("ispostava")
  ) {
    category = ReferenceCategory.TAX_OFFICE
  } else if (queryLower.includes("kamat") || queryLower.includes("interest")) {
    category = ReferenceCategory.INTEREST_RATE
  } else if (queryLower.includes("tečaj") || queryLower.includes("exchange")) {
    category = ReferenceCategory.EXCHANGE_RATE
  } else if (queryLower.includes("obrazac") || queryLower.includes("form")) {
    category = ReferenceCategory.FORM_CODE
  } else if (queryLower.includes("rok") || queryLower.includes("deadline")) {
    category = ReferenceCategory.DEADLINE_CALENDAR
  }

  // Find matching table
  const tableWhere = category ? { category } : {}
  const tables = await db.referenceTable.findMany({
    where: tableWhere,
    include: {
      entries: true,
    },
    take: 5,
  })

  if (tables.length === 0) {
    result.reasoning = `No reference tables found for category: ${category ?? "unknown"}`
    return result
  }

  // Search for matching entry
  const searchTerms = [
    ...entities.locations,
    // Extract Croatian city names from query
    ...[
      "zagreb",
      "split",
      "rijeka",
      "osijek",
      "zadar",
      "pula",
      "dubrovnik",
      "varaždin",
      "karlovac",
      "šibenik",
    ].filter((city) => queryLower.includes(city)),
  ]

  for (const table of tables) {
    result.table = {
      id: table.id,
      category: table.category,
      name: table.name,
      keyColumn: table.keyColumn,
      valueColumn: table.valueColumn,
    }

    result.allEntries = table.entries.map((e) => ({
      key: e.key,
      value: e.value,
      metadata: e.metadata,
    }))

    // Try to find exact match
    for (const term of searchTerms) {
      const match = table.entries.find(
        (e) =>
          e.key.toLowerCase() === term ||
          e.key.toLowerCase().includes(term) ||
          term.includes(e.key.toLowerCase())
      )

      if (match) {
        result.value = match.value
        result.success = true
        result.reasoning = `Found ${table.valueColumn}: ${match.value} for ${table.keyColumn}: ${match.key}`
        return result
      }
    }
  }

  // No exact match found, but we have the table
  if (result.allEntries.length > 0) {
    result.success = true
    result.reasoning = `Found table "${result.table?.name}" with ${result.allEntries.length} entries. No exact match for query.`
  } else {
    result.reasoning = "No matching reference entries found"
  }

  return result
}
