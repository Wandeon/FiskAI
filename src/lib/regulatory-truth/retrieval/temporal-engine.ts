// src/lib/regulatory-truth/retrieval/temporal-engine.ts
import { db } from "@/lib/db"

export interface TemporalEngineResult {
  success: boolean
  provision: {
    id: string
    fromRule: string
    toRule: string
    cutoffDate: Date
    pattern: string
    appliesRule: string
    explanationHr: string
  } | null
  applicableRule: string | null
  reasoning: string
  timeline: Array<{
    date: Date
    event: string
    ruleApplies: string
  }>
}

/**
 * Temporal Engine - handles transitional provision queries
 *
 * Examples:
 * - "Which rate applies for June invoice, July delivery?"
 * - "Old or new VAT rate for December 2024?"
 * - "Prijelazne odredbe za PDV stopu"
 */
export async function runTemporalEngine(
  query: string,
  entities: { dates: string[] }
): Promise<TemporalEngineResult> {
  const result: TemporalEngineResult = {
    success: false,
    provision: null,
    applicableRule: null,
    reasoning: "",
    timeline: [],
  }

  // Extract dates from query
  const datePattern = /(\d{1,2})\.?\s*(\d{1,2})\.?\s*(\d{4})/g
  const monthPattern =
    /(siječanj|veljača|ožujak|travanj|svibanj|lipanj|srpanj|kolovoz|rujan|listopad|studeni|prosinac|january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/gi

  const extractedDates: Date[] = []

  // Parse explicit dates (DD.MM.YYYY format)
  let match
  while ((match = datePattern.exec(query)) !== null) {
    const day = parseInt(match[1])
    const month = parseInt(match[2]) - 1
    const year = parseInt(match[3])
    extractedDates.push(new Date(year, month, day))
  }

  // Parse month names (Croatian and English)
  const monthMap: Record<string, number> = {
    siječanj: 0,
    january: 0,
    veljača: 1,
    february: 1,
    ožujak: 2,
    march: 2,
    travanj: 3,
    april: 3,
    svibanj: 4,
    may: 4,
    lipanj: 5,
    june: 5,
    srpanj: 6,
    july: 6,
    kolovoz: 7,
    august: 7,
    rujan: 8,
    september: 8,
    listopad: 9,
    october: 9,
    studeni: 10,
    november: 10,
    prosinac: 11,
    december: 11,
  }

  while ((match = monthPattern.exec(query)) !== null) {
    const monthName = match[1].toLowerCase()
    const year = match[2] ? parseInt(match[2]) : new Date().getFullYear()
    const month = monthMap[monthName]
    if (month !== undefined) {
      extractedDates.push(new Date(year, month, 1))
    }
  }

  // Find relevant transitional provisions
  const provisions = await db.transitionalProvision.findMany({
    where:
      extractedDates.length > 0
        ? {
            cutoffDate: {
              gte: new Date(
                Math.min(...extractedDates.map((d) => d.getTime())) - 365 * 24 * 60 * 60 * 1000
              ),
              lte: new Date(
                Math.max(...extractedDates.map((d) => d.getTime())) + 365 * 24 * 60 * 60 * 1000
              ),
            },
          }
        : {},
    orderBy: { cutoffDate: "desc" },
    take: 5,
  })

  if (provisions.length === 0) {
    result.reasoning = "No transitional provisions found for the given timeframe"
    return result
  }

  // Find most relevant provision
  const provision = provisions[0]

  result.provision = {
    id: provision.id,
    fromRule: provision.fromRule,
    toRule: provision.toRule,
    cutoffDate: provision.cutoffDate,
    pattern: provision.pattern,
    appliesRule: provision.appliesRule,
    explanationHr: provision.explanationHr,
  }

  // Determine which rule applies based on dates and pattern
  if (extractedDates.length > 0) {
    const queryDate = extractedDates[0]
    const cutoff = provision.cutoffDate

    switch (provision.pattern) {
      case "INVOICE_DATE":
        result.applicableRule = queryDate < cutoff ? provision.fromRule : provision.toRule
        result.reasoning = `Based on invoice date ${queryDate.toISOString().split("T")[0]}: applies ${result.applicableRule}`
        break

      case "DELIVERY_DATE":
        result.applicableRule = queryDate < cutoff ? provision.fromRule : provision.toRule
        result.reasoning = `Based on delivery date: applies ${result.applicableRule}`
        break

      case "PAYMENT_DATE":
        result.applicableRule = queryDate < cutoff ? provision.fromRule : provision.toRule
        result.reasoning = `Based on payment date: applies ${result.applicableRule}`
        break

      case "EARLIER_EVENT":
        // For EARLIER_EVENT, if any date is before cutoff, old rule applies
        result.applicableRule = extractedDates.some((d) => d < cutoff)
          ? provision.fromRule
          : provision.toRule
        result.reasoning = `Based on earlier of the events: applies ${result.applicableRule}`
        break

      case "LATER_EVENT":
        // For LATER_EVENT, if all dates are before cutoff, old rule applies
        result.applicableRule = extractedDates.every((d) => d < cutoff)
          ? provision.fromRule
          : provision.toRule
        result.reasoning = `Based on later of the events: applies ${result.applicableRule}`
        break

      case "TAXPAYER_CHOICE":
        result.applicableRule = provision.appliesRule
        result.reasoning = `Taxpayer can choose between ${provision.fromRule} and ${provision.toRule}`
        break

      default:
        result.applicableRule = queryDate < cutoff ? provision.fromRule : provision.toRule
        result.reasoning = `Based on date comparison: applies ${result.applicableRule}`
    }

    // Build timeline
    result.timeline = [
      {
        date: new Date(cutoff.getTime() - 1),
        event: `Before ${cutoff.toISOString().split("T")[0]}`,
        ruleApplies: provision.fromRule,
      },
      {
        date: cutoff,
        event: `Cutoff: ${cutoff.toISOString().split("T")[0]}`,
        ruleApplies: "Transition",
      },
      {
        date: new Date(cutoff.getTime() + 1),
        event: `After ${cutoff.toISOString().split("T")[0]}`,
        ruleApplies: provision.toRule,
      },
    ]
  } else {
    result.applicableRule = provision.appliesRule
    result.reasoning = provision.explanationHr
  }

  result.success = true

  return result
}
