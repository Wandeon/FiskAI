import OpenAI from 'openai'
import { ExtractionResult, ExtractedReceipt } from './types'

// Lazy-load OpenAI client to avoid build errors when API key is not set
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
}

export async function extractFromImage(imageBase64: string): Promise<ExtractionResult<ExtractedReceipt>> {
  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract receipt data from this image. Return JSON:
{
  "vendor": "business name",
  "vendorOib": "OIB if visible",
  "date": "YYYY-MM-DD",
  "items": [{"description": "", "quantity": 1, "unitPrice": 0, "total": 0, "vatRate": 25}],
  "subtotal": 0,
  "vatAmount": 0,
  "total": 0,
  "paymentMethod": "cash|card|transfer",
  "currency": "EUR",
  "confidence": 0.0-1.0
}
Croatian: PDV=VAT, Ukupno=Total, Gotovina=Cash, Kartica=Card`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }
      ],
      max_tokens: 1000
    })

    const content = response.choices[0]?.message?.content || ''
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: 'No JSON in response', rawText: content }
    }

    const data = JSON.parse(jsonMatch[0]) as ExtractedReceipt
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR failed'
    }
  }
}

export async function extractFromImageUrl(imageUrl: string): Promise<ExtractionResult<ExtractedReceipt>> {
  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract receipt data from this image. Return JSON:
{
  "vendor": "business name",
  "vendorOib": "OIB if visible",
  "date": "YYYY-MM-DD",
  "items": [{"description": "", "quantity": 1, "unitPrice": 0, "total": 0, "vatRate": 25}],
  "subtotal": 0,
  "vatAmount": 0,
  "total": 0,
  "paymentMethod": "cash|card|transfer",
  "currency": "EUR",
  "confidence": 0.0-1.0
}
Croatian: PDV=VAT, Ukupno=Total, Gotovina=Cash, Kartica=Card`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 1000
    })

    const content = response.choices[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: 'No JSON in response', rawText: content }
    }

    const data = JSON.parse(jsonMatch[0]) as ExtractedReceipt
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR failed'
    }
  }
}
