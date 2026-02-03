// apps/web/src/lib/document-ocr.ts

export interface DocumentOcrResult {
  success: boolean
  data?: {
    oib?: string
    name?: string
    address?: string
    city?: string
    postalCode?: string
    foundingDate?: string // ISO format YYYY-MM-DD
    documentType: "obrtnica" | "sudsko_rjesenje" | "unknown"
  }
  confidence?: number
  error?: string
}

const OBRTNICA_PROMPT = `Analiziraj ovaj dokument (Obrtnicu ili Sudsko rješenje) i izvuci podatke.

Vraćaj SAMO JSON bez dodatnog teksta:
{
  "documentType": "obrtnica" ili "sudsko_rjesenje" ili "unknown",
  "oib": "11-znamenkasti OIB broj",
  "name": "Naziv obrta ili tvrtke",
  "address": "Ulica i kućni broj",
  "city": "Grad/Mjesto",
  "postalCode": "Poštanski broj (5 znamenki)",
  "foundingDate": "Datum osnivanja u formatu YYYY-MM-DD",
  "confidence": 0.0-1.0
}

Pravila:
- OIB ima točno 11 znamenki
- Poštanski broj ima 5 znamenki
- Ako podatak nije vidljiv, koristi null
- Za datum koristi ISO format YYYY-MM-DD`

interface OllamaResponse {
  response: string
  done: boolean
}

interface ParsedOcrData {
  documentType?: "obrtnica" | "sudsko_rjesenje" | "unknown"
  oib?: string | null
  name?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  foundingDate?: string | null
  confidence?: number
}

/**
 * Validate OIB format (11 digits)
 */
function isValidOibFormat(oib: string | null | undefined): boolean {
  if (!oib) return false
  return /^\d{11}$/.test(oib)
}

/**
 * Validate Croatian postal code format (5 digits)
 */
function isValidPostalCode(postalCode: string | null | undefined): boolean {
  if (!postalCode) return false
  return /^\d{5}$/.test(postalCode)
}

/**
 * Validate ISO date format YYYY-MM-DD
 */
function isValidIsoDate(date: string | null | undefined): boolean {
  if (!date) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

/**
 * Extract business data from uploaded document using vision LLM
 */
export async function extractFromDocument(
  imageBase64: string
): Promise<DocumentOcrResult> {
  const model = process.env.OLLAMA_VISION_MODEL || "llama3.2-vision"
  const endpoint = process.env.OLLAMA_ENDPOINT || "http://localhost:11434"

  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: OBRTNICA_PROMPT,
        images: [imageBase64],
        stream: false,
        format: "json",
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        error: "AI servis nije dostupan. Unesite podatke ručno.",
      }
    }

    const result: OllamaResponse = await response.json()
    const content = result.response

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        error: "Nije moguće prepoznati dokument. Unesite podatke ručno.",
      }
    }

    const parsed: ParsedOcrData = JSON.parse(jsonMatch[0])

    // Validate and sanitize OIB
    const oib = isValidOibFormat(parsed.oib) ? parsed.oib : undefined

    // Validate and sanitize postal code
    const postalCode = isValidPostalCode(parsed.postalCode) ? parsed.postalCode : undefined

    // Validate and sanitize founding date
    const foundingDate = isValidIsoDate(parsed.foundingDate) ? parsed.foundingDate : undefined

    // Determine document type with fallback
    let documentType: "obrtnica" | "sudsko_rjesenje" | "unknown" = "unknown"
    if (parsed.documentType === "obrtnica" || parsed.documentType === "sudsko_rjesenje") {
      documentType = parsed.documentType
    }

    return {
      success: true,
      data: {
        oib: oib ?? undefined,
        name: parsed.name ?? undefined,
        address: parsed.address ?? undefined,
        city: parsed.city ?? undefined,
        postalCode: postalCode ?? undefined,
        foundingDate: foundingDate ?? undefined,
        documentType,
      },
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: "Nije moguće prepoznati dokument. Unesite podatke ručno.",
      }
    }

    return {
      success: false,
      error: "Greška pri obradi dokumenta. Unesite podatke ručno.",
    }
  }
}
