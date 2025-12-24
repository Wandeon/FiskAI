// src/lib/assistant/query-engine/text-utils.ts

const DIACRITIC_MAP: Record<string, string> = {
  č: "c",
  Č: "C",
  ć: "c",
  Ć: "C",
  ž: "z",
  Ž: "Z",
  š: "s",
  Š: "S",
  đ: "d",
  Đ: "D",
}

const CROATIAN_STOPWORDS = new Set([
  // Articles and pronouns
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
  // Prepositions
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
  // Conjunctions
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
  // Auxiliary verbs
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
  // Question words (normalized)
  "sto",
  "tko",
  "koji",
  "koja",
  "koje",
  "kako",
  "zasto",
  "gdje",
  "koliko",
  // Common words
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
])

export function normalizeDiacritics(text: string): string {
  return text.replace(/[čćžšđČĆŽŠĐ]/g, (char) => DIACRITIC_MAP[char] || char)
}

export function tokenize(text: string): string[] {
  const normalized = normalizeDiacritics(text)
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

export function extractKeywords(text: string): string[] {
  const tokens = tokenize(text)
  const keywords = tokens.filter((token) => token.length > 1 && !CROATIAN_STOPWORDS.has(token))
  return [...new Set(keywords)]
}
