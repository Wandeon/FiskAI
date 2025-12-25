// src/lib/assistant/query-engine/concept-matcher.ts
import { prisma } from "@/lib/prisma"
import { normalizeDiacritics } from "./text-utils"

/**
 * FAIL-CLOSED CONCEPT MATCHER
 *
 * This matcher uses strict token-level matching with a minimum score threshold.
 * Gibberish queries MUST return no matches, triggering a REFUSAL.
 *
 * Key invariants:
 * 1. No substring matching - exact token matches only
 * 2. Minimum token length of 3 characters
 * 3. Stopwords removed from matching
 * 4. Minimum score threshold enforced
 */

export interface ConceptMatch {
  conceptId: string
  slug: string
  nameHr: string
  score: number
  matchedKeywords: string[]
}

// Minimum score threshold - concepts below this are NOT matched
const MINIMUM_SCORE_THRESHOLD = 0.25

// Minimum token length for matching
const MINIMUM_TOKEN_LENGTH = 3

// Stopwords to filter from both query and concept terms
const STOPWORDS = new Set([
  // Croatian
  "ja",
  "ti",
  "on",
  "ona",
  "ono",
  "mi",
  "vi",
  "oni",
  "one",
  "moj",
  "tvoj",
  "njegov",
  "njezin",
  "nas",
  "vas",
  "njihov",
  "u",
  "na",
  "za",
  "od",
  "do",
  "iz",
  "po",
  "sa",
  "s",
  "o",
  "prema",
  "kroz",
  "i",
  "a",
  "ali",
  "ili",
  "no",
  "nego",
  "da",
  "jer",
  "ako",
  "kad",
  "kada",
  "je",
  "su",
  "sam",
  "si",
  "smo",
  "ste",
  "biti",
  "bio",
  "bila",
  "bilo",
  "sto",
  "tko",
  "koji",
  "koja",
  "koje",
  "kako",
  "zasto",
  "gdje",
  "koliko",
  "to",
  "taj",
  "ta",
  "te",
  "ovo",
  "ova",
  "ove",
  "sve",
  "svi",
  "kao",
  "vec",
  "samo",
  "jos",
  "ima",
  "imati",
  "mogu",
  "moze",
  "treba",
  "mora",
  // English
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "of",
  "in",
  "to",
  "for",
  "with",
  "on",
  "at",
  "by",
  "from",
  "as",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "when",
  "where",
  "why",
  "how",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "it",
  "its",
  "they",
  "them",
  "their",
])

/**
 * Tokenize and normalize a string for matching
 * - Normalizes diacritics
 * - Lowercases
 * - Splits on whitespace and hyphens
 * - Removes tokens shorter than MINIMUM_TOKEN_LENGTH
 * - Removes stopwords
 */
function tokenizeForMatching(text: string): string[] {
  const normalized = normalizeDiacritics(text).toLowerCase()
  const tokens = normalized
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((t) => t.length >= MINIMUM_TOKEN_LENGTH)
    .filter((t) => !STOPWORDS.has(t))

  return [...new Set(tokens)]
}

/**
 * Calculate match score between query tokens and concept tokens
 * Uses exact token matching only - NO substring matching
 */
function calculateMatchScore(
  queryTokens: string[],
  conceptTokens: Set<string>
): { score: number; matchedTokens: string[] } {
  if (queryTokens.length === 0) {
    return { score: 0, matchedTokens: [] }
  }

  const matchedTokens: string[] = []

  for (const queryToken of queryTokens) {
    // EXACT match only - no substring matching
    if (conceptTokens.has(queryToken)) {
      matchedTokens.push(queryToken)
    }
  }

  // Score = proportion of query tokens that matched
  const score = matchedTokens.length / queryTokens.length

  return { score, matchedTokens }
}

export async function matchConcepts(keywords: string[]): Promise<ConceptMatch[]> {
  // Tokenize and filter keywords
  const queryTokens = keywords
    .flatMap((k) => tokenizeForMatching(k))
    .filter((t) => t.length >= MINIMUM_TOKEN_LENGTH)
    .filter((t) => !STOPWORDS.has(t))

  // If no valid query tokens after filtering, return empty (will trigger REFUSAL)
  if (queryTokens.length === 0) {
    return []
  }

  // Fetch all concepts
  const concepts = await prisma.concept.findMany({
    select: {
      id: true,
      slug: true,
      nameHr: true,
      aliases: true,
    },
  })

  const matches: ConceptMatch[] = []

  for (const concept of concepts) {
    // Build set of concept tokens from slug, name, and aliases
    const slugTokens = tokenizeForMatching(concept.slug)
    const nameTokens = tokenizeForMatching(concept.nameHr)
    const aliasTokens = (concept.aliases || []).flatMap((a) => tokenizeForMatching(a))

    const conceptTokens = new Set([...slugTokens, ...nameTokens, ...aliasTokens])

    // Calculate match score
    const { score, matchedTokens } = calculateMatchScore(queryTokens, conceptTokens)

    // HARD GATE: Only include matches above threshold
    if (score >= MINIMUM_SCORE_THRESHOLD && matchedTokens.length > 0) {
      matches.push({
        conceptId: concept.id,
        slug: concept.slug,
        nameHr: concept.nameHr,
        score,
        matchedKeywords: matchedTokens,
      })
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score)
}
