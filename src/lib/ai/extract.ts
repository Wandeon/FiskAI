import OpenAI from 'openai'
import { ExtractedReceipt, ExtractedInvoice, ExtractionResult } from './types'

// Lazy-load OpenAI client to avoid build errors when API key is not set
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
}

const RECEIPT_PROMPT = `Extract the following information from this receipt text. Return JSON only.
{
  "vendor": "business name",
  "vendorOib": "11 digit OIB if visible",
  "date": "YYYY-MM-DD",
  "items": [{ "description": "", "quantity": 1, "unitPrice": 0.00, "total": 0.00, "vatRate": 25 }],
  "subtotal": 0.00,
  "vatAmount": 0.00,
  "total": 0.00,
  "paymentMethod": "cash|card|transfer",
  "currency": "EUR",
  "confidence": 0.0-1.0
}

Croatian context: PDV=VAT, Ukupno=Total, Gotovina=Cash, Kartica=Card
`

const INVOICE_PROMPT = `Extract the following information from this invoice text. Return JSON only.
{
  "invoiceNumber": "invoice number",
  "vendor": "business name",
  "vendorOib": "11 digit OIB if visible",
  "date": "YYYY-MM-DD",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "buyerName": "buyer name if visible",
  "buyerOib": "buyer OIB if visible",
  "items": [{ "description": "", "quantity": 1, "unitPrice": 0.00, "total": 0.00, "vatRate": 25 }],
  "subtotal": 0.00,
  "vatAmount": 0.00,
  "total": 0.00,
  "paymentMethod": "cash|card|transfer",
  "currency": "EUR",
  "confidence": 0.0-1.0
}

Croatian context: PDV=VAT, Ukupno=Total, Račun br.=Invoice no., Datum dospijeća=Due date
`

export async function extractReceipt(text: string): Promise<ExtractionResult<ExtractedReceipt>> {
  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RECEIPT_PROMPT },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { success: false, error: 'No response from AI' }
    }

    const data = JSON.parse(content) as ExtractedReceipt
    return { success: true, data, rawText: text }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
      rawText: text
    }
  }
}

export async function extractInvoice(text: string): Promise<ExtractionResult<ExtractedInvoice>> {
  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: INVOICE_PROMPT },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { success: false, error: 'No response from AI' }
    }

    const data = JSON.parse(content) as ExtractedInvoice
    return { success: true, data, rawText: text }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
      rawText: text
    }
  }
}
