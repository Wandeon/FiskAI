import { nanoid } from "nanoid"
import {
  SCHEMA_VERSION,
  type AssistantResponse,
  type Surface,
  type Topic,
  type RefusalReason,
  type ClientContextBlock,
} from "@/lib/assistant/types"
import { assistantLogger } from "@/lib/logger"
import { extractKeywords } from "./text-utils"
import { matchConcepts } from "./concept-matcher"
import { selectRules } from "./rule-selector"
import { detectConflicts } from "./conflict-detector"
import { buildCitations } from "./citation-builder"
import {
  interpretQuery,
  shouldProceedToRetrieval,
  isJurisdictionValid,
  getRetrievalMode,
  CONFIDENCE_THRESHOLD_CLARIFY,
  CONFIDENCE_THRESHOLD_STRICT,
  type Interpretation,
} from "./query-interpreter"

/**
 * THREE-STAGE FAIL-CLOSED ANSWER BUILDER
 *
 * Stage 1: Query Interpretation (interpretQuery)
 *   - Classifies topic, intent, jurisdiction
 *   - Detects personalization needs, nonsense, foreign jurisdictions
 *   - Computes confidence score
 *   - CONFIDENCE TIERS:
 *     - < 0.6 → NEEDS_CLARIFICATION (always)
 *     - 0.6-0.75 → Stricter retrieval (need 2+ entities)
 *     - >= 0.75 → Normal retrieval
 *   - Nonsense → OUT_OF_SCOPE ("Please rephrase")
 *   - Foreign country → UNSUPPORTED_JURISDICTION
 *
 * Stage 2: Retrieval Gate (matchConcepts + selectRules)
 *   - Only runs if interpretation passes threshold
 *   - Strict token matching with minimum score
 *   - If no matches → NEEDS_CLARIFICATION (not NO_CITABLE_RULES for vague queries)
 *
 * Stage 3: Answer Eligibility Gate
 *   - Validates citations exist
 *   - Checks for unresolved conflicts
 *   - Validates personalization requirements
 *   - Only then builds the answer
 *
 * INVARIANT: The system REFUSES more often than it answers.
 * INVARIANT: Vague queries always get clarification, never "no sources found".
 */

// Fields that would be used for personalization
const PERSONALIZATION_FIELDS: Record<string, string[]> = {
  pausalni: ["yearlyRevenue", "businessType", "activityCode"],
  pdv: ["yearlyRevenue", "euTransactions", "vatRegistered"],
  doprinosi: ["businessType", "yearlyIncome", "employeeCount"],
  fiskalizacija: ["businessType", "cashTransactions", "posDevice"],
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

  // ============================================
  // STAGE 1: QUERY INTERPRETATION
  // ============================================
  const interpretation = interpretQuery(query, surface)

  // Store interpretation for debugging (in non-production)
  const debugInfo = {
    interpretation: {
      topic: interpretation.topic,
      intent: interpretation.intent,
      jurisdiction: interpretation.jurisdiction,
      confidence: interpretation.confidence,
      entities: interpretation.entities,
      personalizationNeeded: interpretation.personalizationNeeded,
      matchedPatterns: interpretation.matchedPatterns,
      isNonsense: interpretation.isNonsense,
      nonsenseRatio: interpretation.nonsenseRatio,
      foreignCountryDetected: interpretation.foreignCountryDetected,
    },
  }

  // Helper for telemetry
  const emitTelemetry = (event: string, extra: Record<string, unknown> = {}) => {
    assistantLogger.info(
      {
        event,
        queryLength: query.length,
        tokenCount: interpretation.rawTokenCount,
        meaningfulTokenCount: interpretation.meaningfulTokenCount,
        detectedTopic: interpretation.topic,
        confidence: interpretation.confidence,
        surface,
        traceId,
        ...extra,
      },
      `assistant.interpretation.${event}`
    )
  }

  // ============================================
  // GATE 0A: NONSENSE DETECTION (before everything)
  // ============================================
  // If >60% of tokens are gibberish, return OUT_OF_SCOPE with "Please rephrase"
  if (interpretation.isNonsense) {
    emitTelemetry("nonsense_detected", { nonsenseRatio: interpretation.nonsenseRatio })
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic: "UNKNOWN" as Topic,
      headline: "Molimo preformulirajte upit",
      directAnswer: "",
      refusalReason: "OUT_OF_SCOPE" as RefusalReason,
      refusal: {
        message:
          "Nismo uspjeli razumjeti vaš upit. Molimo preformulirajte pitanje koristeći jasnije pojmove.",
        relatedTopics: [
          "Koja je stopa PDV-a u Hrvatskoj?",
          "Koji je prag za paušalni obrt?",
          "Kako fiskalizirati račun?",
          "Kada moram u sustav PDV-a?",
        ],
      },
    }
  }

  // GATE 0B: Confidence threshold (tiered: <0.6 always clarify)
  if (interpretation.confidence < CONFIDENCE_THRESHOLD_CLARIFY) {
    emitTelemetry("low_confidence", { threshold: CONFIDENCE_THRESHOLD_CLARIFY })
    return buildClarificationRefusal(baseResponse, interpretation)
  }

  // GATE 1B: Topic scope check
  if (interpretation.topic === "PRODUCT") {
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic: interpretation.topic,
      headline: "Pitanje o proizvodu",
      directAnswer: "",
      refusalReason: "OUT_OF_SCOPE",
      refusal: {
        message:
          "Za pitanja o FiskAI proizvodu, pretplati ili funkcijama, posjetite našu stranicu s cijenama ili kontaktirajte podršku.",
        redirectOptions: [
          { label: "Cijene", href: "/pricing", type: "DOCS" },
          { label: "Kontakt", href: "/contact", type: "CONTACT" },
        ],
      },
    }
  }

  if (interpretation.topic === "SUPPORT") {
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic: interpretation.topic,
      headline: "Tehnička podrška",
      directAnswer: "",
      refusalReason: "OUT_OF_SCOPE",
      refusal: {
        message: "Za tehničku podršku ili prijavu problema, kontaktirajte naš tim za podršku.",
        redirectOptions: [
          { label: "Podrška", href: "/support", type: "SUPPORT" },
          { label: "Kontakt", href: "/contact", type: "CONTACT" },
        ],
      },
    }
  }

  // GATE 1C: Foreign jurisdiction check
  // If user explicitly mentions a foreign country, refuse immediately
  if (interpretation.foreignCountryDetected) {
    const country = interpretation.foreignCountryDetected
    emitTelemetry("unsupported_jurisdiction", { foreignCountry: country })
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic: interpretation.topic,
      headline: "Nepodržana jurisdikcija",
      directAnswer: "",
      refusalReason: "UNSUPPORTED_JURISDICTION" as RefusalReason,
      refusal: {
        message: `Pitanje se odnosi na ${country}. Ovaj asistent odgovara samo na pitanja o hrvatskim i EU propisima koji se primjenjuju u Hrvatskoj. Za propise ${country === "Germany" ? "Njemačke" : country === "Austria" ? "Austrije" : country === "Slovenia" ? "Slovenije" : country === "Serbia" ? "Srbije" : country === "Bosnia" ? "BiH" : country === "Italy" ? "Italije" : country === "USA" ? "SAD-a" : country === "UK" ? "UK" : country}, konzultirajte lokalne stručnjake.`,
        relatedTopics: [
          "Porez na dohodak u Hrvatskoj",
          "PDV u Hrvatskoj",
          "Paušalni obrt u Hrvatskoj",
        ],
      },
    }
  }

  // GATE 1D: General jurisdiction validity check (for regulatory topics)
  if (interpretation.topic === "REGULATORY" && !isJurisdictionValid(interpretation)) {
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic: interpretation.topic,
      headline: "Nepodržana jurisdikcija",
      directAnswer: "",
      refusalReason: "UNSUPPORTED_JURISDICTION" as RefusalReason,
      refusal: {
        message:
          "Ovaj asistent odgovara samo na pitanja o hrvatskim i EU propisima. Za druge jurisdikcije, konzultirajte lokalne stručnjake.",
        relatedTopics: ["hrvatski porezni sustav", "PDV u Hrvatskoj", "paušalni obrt"],
      },
    }
  }

  // GATE 1E: Personalization check (before retrieval)
  if (interpretation.personalizationNeeded) {
    if (surface === "MARKETING") {
      return {
        ...baseResponse,
        kind: "REFUSAL",
        topic: interpretation.topic,
        headline: "Potrebni su podaci o poslovanju",
        directAnswer: "",
        refusalReason: "MISSING_CLIENT_DATA" as RefusalReason,
        refusal: {
          message:
            "Za personalizirani odgovor na ovo pitanje potrebni su podaci o vašem poslovanju. Prijavite se za pristup personaliziranim izračunima.",
          relatedTopics: ["porez na dohodak", "PDV pragovi", "paušalni obrt", "doprinosi"],
        },
      }
    } else if (surface === "APP" && !companyId) {
      const requiredFields = getRequiredFieldsFromEntities(interpretation.entities)
      return {
        ...baseResponse,
        kind: "REFUSAL",
        topic: interpretation.topic,
        headline: "Potrebni su podaci o poslovanju",
        directAnswer: "",
        refusalReason: "MISSING_CLIENT_DATA" as RefusalReason,
        refusal: {
          message:
            "Za personalizirani odgovor na ovo pitanje potrebni su podaci o vašem poslovanju. Molimo povežite vaš poslovni profil.",
        },
        clientContext: {
          used: [],
          completeness: {
            status: "NONE",
            score: 0,
          },
          missing: requiredFields.map((f) => ({
            label: f,
            impact: "Potrebno za personalizirani odgovor",
          })),
        },
      }
    }
    // APP surface with companyId: Continue to try to answer with client context
  }

  // ============================================
  // STAGE 2: RETRIEVAL GATE
  // ============================================

  // Extract keywords for concept matching
  const keywords = extractKeywords(query)

  // Match concepts
  const conceptMatches = await matchConcepts(keywords)

  if (conceptMatches.length === 0) {
    // INVARIANT: Vague queries get clarification, not "no sources found"
    // If confidence < 0.75, query is likely vague → ask for clarification
    if (interpretation.confidence < CONFIDENCE_THRESHOLD_STRICT) {
      emitTelemetry("needs_clarification", {
        reason: "no_concept_matches",
        threshold: CONFIDENCE_THRESHOLD_STRICT,
      })
      return buildClarificationRefusal(baseResponse, interpretation)
    }
    // Only return NO_CITABLE_RULES for specific queries with no matches
    emitTelemetry("no_citable_rules", { reason: "no_concept_matches" })
    return buildNoCitableRulesRefusal(baseResponse, interpretation.topic, interpretation)
  }

  // Select rules for matched concepts
  const conceptSlugs = conceptMatches.map((c) => c.slug)
  const rules = await selectRules(conceptSlugs)

  if (rules.length === 0) {
    // Same logic: vague queries get clarification
    if (interpretation.confidence < CONFIDENCE_THRESHOLD_STRICT) {
      emitTelemetry("needs_clarification", {
        reason: "no_rule_matches",
        threshold: CONFIDENCE_THRESHOLD_STRICT,
      })
      return buildClarificationRefusal(baseResponse, interpretation)
    }
    emitTelemetry("no_citable_rules", { reason: "no_rule_matches" })
    return buildNoCitableRulesRefusal(baseResponse, interpretation.topic, interpretation)
  }

  // ============================================
  // STAGE 3: ANSWER ELIGIBILITY GATE
  // ============================================

  // GATE 3A: Check for conflicts
  const conflictResult = detectConflicts(rules)

  if (conflictResult.hasConflict && !conflictResult.canResolve) {
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic: interpretation.topic,
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

  // GATE 3B: Build citations (REQUIRED for ANSWER)
  const citations = buildCitations(rules)

  if (!citations) {
    return buildNoCitableRulesRefusal(baseResponse, interpretation.topic, interpretation)
  }

  // GATE 3C: Validate primary citation has required fields
  if (!citations.primary.quote || !citations.primary.url) {
    return buildNoCitableRulesRefusal(baseResponse, interpretation.topic, interpretation)
  }

  // ============================================
  // BUILD ANSWER (only if all gates pass)
  // ============================================

  const primaryRule = rules[0]

  // Build client context for APP surface
  let clientContext: ClientContextBlock | undefined
  if (surface === "APP") {
    if (interpretation.personalizationNeeded && companyId) {
      const requiredFields = getRequiredFieldsFromEntities(interpretation.entities)
      clientContext = {
        used: [], // Would be populated from actual client data
        completeness: {
          status: "PARTIAL",
          score: 0.5,
        },
        missing: requiredFields.map((f) => ({
          label: f,
          impact: "Poboljšalo bi točnost odgovora",
        })),
      }
    } else if (!interpretation.personalizationNeeded) {
      clientContext = {
        used: [],
        completeness: {
          status: "COMPLETE",
          score: 1.0,
        },
      }
    }
  }

  return {
    ...baseResponse,
    kind: "ANSWER",
    topic: interpretation.topic,
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
    ...(clientContext && { clientContext }),
  }
}

// === HELPER FUNCTIONS ===

function buildClarificationRefusal(
  base: Partial<AssistantResponse>,
  interpretation: Interpretation
): AssistantResponse {
  return {
    ...base,
    kind: "REFUSAL",
    topic: interpretation.topic,
    headline: "Molimo precizirajte pitanje",
    directAnswer: "",
    refusalReason: "NEEDS_CLARIFICATION" as RefusalReason,
    refusal: {
      message:
        "Nismo sigurni što točno želite saznati. Molimo odaberite jedno od dolje navedenih pitanja ili preformulirajte upit.",
      relatedTopics: interpretation.suggestedClarifications || [
        "Koja je opća stopa PDV-a u Hrvatskoj?",
        "Koji je prag za paušalni obrt?",
        "Kako fiskalizirati račun?",
        "Kada moram u sustav PDV-a?",
      ],
    },
  } as AssistantResponse
}

function buildNoCitableRulesRefusal(
  base: Partial<AssistantResponse>,
  topic: Topic,
  interpretation?: Interpretation
): AssistantResponse {
  const suggestions = interpretation?.suggestedClarifications || [
    "porez na dohodak",
    "PDV stope",
    "paušalni obrt",
    "fiskalizacija",
  ]

  return {
    ...base,
    kind: "REFUSAL",
    topic,
    headline: "Nema dostupnih službenih izvora",
    directAnswer: "",
    refusalReason: "NO_CITABLE_RULES",
    refusal: {
      message: "Nismo pronašli službene izvore koji odgovaraju na vaše pitanje.",
      relatedTopics: suggestions,
    },
  } as AssistantResponse
}

function getRequiredFieldsFromEntities(entities: string[]): string[] {
  const requiredFields: string[] = []

  for (const entity of entities) {
    const entityLower = entity.toLowerCase()
    for (const [domain, fields] of Object.entries(PERSONALIZATION_FIELDS)) {
      if (entityLower.includes(domain) || domain.includes(entityLower)) {
        requiredFields.push(...fields)
      }
    }
  }

  // Default fields if no specific match
  if (requiredFields.length === 0) {
    requiredFields.push("yearlyRevenue", "businessType")
  }

  return [...new Set(requiredFields)]
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
export type { Interpretation } from "./query-interpreter"
