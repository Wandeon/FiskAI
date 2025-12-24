import { nanoid } from "nanoid"
import {
  SCHEMA_VERSION,
  type AssistantResponse,
  type Surface,
  type Topic,
  type RefusalReason,
} from "@/lib/assistant/types"
import { extractKeywords } from "./text-utils"
import { matchConcepts } from "./concept-matcher"
import { selectRules } from "./rule-selector"
import { detectConflicts } from "./conflict-detector"
import { buildCitations } from "./citation-builder"

// Simple topic classification keywords
const PRODUCT_KEYWORDS = ["fiskai", "prijava", "registracija", "aplikacija", "cijena", "plan"]
const SUPPORT_KEYWORDS = ["pomoc", "podrska", "greska", "bug", "ne-radi", "problem"]

function classifyTopic(keywords: string[]): Topic {
  const normalizedKeywords = keywords.map((k) => k.toLowerCase())

  if (PRODUCT_KEYWORDS.some((pk) => normalizedKeywords.includes(pk))) {
    return "PRODUCT"
  }
  if (SUPPORT_KEYWORDS.some((sk) => normalizedKeywords.includes(sk))) {
    return "SUPPORT"
  }

  // Default to regulatory for this assistant
  return "REGULATORY"
}

export async function buildAnswer(
  query: string,
  surface: Surface,
  companyId?: string
): Promise<AssistantResponse> {
  const requestId = `req_${nanoid()}`
  const traceId = `trace_${nanoid()}`
  const createdAt = new Date().toISOString()

  // Base response fields
  const baseResponse = {
    schemaVersion: SCHEMA_VERSION,
    requestId,
    traceId,
    surface,
    createdAt,
  }

  // 1. Extract keywords
  const keywords = extractKeywords(query)

  // 2. Classify topic
  const topic = classifyTopic(keywords)

  // If not regulatory, return refusal (this assistant only handles regulatory)
  if (topic !== "REGULATORY") {
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic,
      headline: "Ovo pitanje nije regulatorne prirode",
      directAnswer: "",
      refusalReason: "OUT_OF_SCOPE",
      refusal: {
        message:
          "Ovaj asistent odgovara samo na regulatorna pitanja o porezima, PDV-u, doprinosima i fiskalizaciji.",
        relatedTopics: ["porez na dohodak", "PDV", "doprinosi", "fiskalizacija"],
      },
    }
  }

  // 3. Match concepts
  const conceptMatches = await matchConcepts(keywords)

  if (conceptMatches.length === 0) {
    return buildNoCitableRulesRefusal(baseResponse, topic)
  }

  // 4. Select rules for matched concepts
  const conceptSlugs = conceptMatches.map((c) => c.slug)
  const rules = await selectRules(conceptSlugs)

  if (rules.length === 0) {
    return buildNoCitableRulesRefusal(baseResponse, topic)
  }

  // 5. Check for conflicts
  const conflictResult = detectConflicts(rules)

  if (conflictResult.hasConflict && !conflictResult.canResolve) {
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic,
      headline: "Proturječni propisi",
      directAnswer: "",
      refusalReason: "UNRESOLVED_CONFLICT",
      conflict: {
        status: "UNRESOLVED",
        description: conflictResult.description || "Višestruki izvori se ne slažu",
        sources: [],
      },
      refusal: {
        message:
          "Pronađeni su proturječni propisi za vaše pitanje. Preporučujemo konzultaciju sa stručnjakom.",
        conflictingSources: [],
      },
    }
  }

  // 6. Build citations
  const citations = buildCitations(rules)

  if (!citations) {
    return buildNoCitableRulesRefusal(baseResponse, topic)
  }

  // 7. Build answer from primary rule
  const primaryRule = rules[0]

  return {
    ...baseResponse,
    kind: "ANSWER",
    topic,
    headline: primaryRule.titleHr,
    directAnswer:
      primaryRule.explanationHr || formatValue(primaryRule.value, primaryRule.valueType),
    citations,
    confidence: {
      level:
        primaryRule.confidence >= 0.9 ? "HIGH" : primaryRule.confidence >= 0.7 ? "MEDIUM" : "LOW",
      score: primaryRule.confidence,
    },
    relatedQuestions: generateRelatedQuestions(conceptSlugs),
  }
}

function buildNoCitableRulesRefusal(
  base: Partial<AssistantResponse>,
  topic: Topic
): AssistantResponse {
  return {
    ...base,
    kind: "REFUSAL",
    topic,
    headline: "Nema dostupnih službenih izvora",
    directAnswer: "",
    refusalReason: "NO_CITABLE_RULES",
    refusal: {
      message: "Nismo pronašli službene izvore koji odgovaraju na vaše pitanje.",
      relatedTopics: ["porez na dohodak", "PDV stope", "paušalni obrt", "fiskalizacija"],
    },
  } as AssistantResponse
}

function formatValue(value: string, valueType: string): string {
  switch (valueType) {
    case "currency_eur":
      return `${parseFloat(value).toLocaleString("hr-HR")} EUR`
    case "currency_hrk":
      return `${parseFloat(value).toLocaleString("hr-HR")} HRK`
    case "percentage":
      return `${value}%`
    default:
      return value
  }
}

function generateRelatedQuestions(conceptSlugs: string[]): string[] {
  // Static related questions based on concept areas
  const questionMap: Record<string, string[]> = {
    pausalni: ["Koji su uvjeti za paušalni obrt?", "Kada prelazim u redovno oporezivanje?"],
    pdv: ["Koje su stope PDV-a?", "Kada moram u sustav PDV-a?"],
    doprinosi: ["Koliki su doprinosi za obrtnike?", "Kada se plaćaju doprinosi?"],
  }

  const questions: string[] = []
  for (const slug of conceptSlugs) {
    for (const [key, qs] of Object.entries(questionMap)) {
      if (slug.includes(key)) {
        questions.push(...qs)
      }
    }
  }

  return [...new Set(questions)].slice(0, 4)
}

// Re-export types for API layer
export type { ConceptMatch } from "./concept-matcher"
export type { RuleCandidate } from "./rule-selector"
export type { ConflictResult } from "./conflict-detector"
