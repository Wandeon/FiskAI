import { NextRequest } from "next/server"
import { buildAnswer } from "@/lib/assistant/query-engine/answer-builder"
import { validateResponse } from "@/lib/assistant/validation"
import type { Surface } from "@/lib/assistant/types"

interface ChatRequest {
  query: string
  surface: Surface
  companyId?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ChatRequest

  // Validate request
  if (!body.query || !body.surface) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Create readable stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Build full answer
        const response = await buildAnswer(body.query, body.surface, body.companyId)

        // Validate
        const validation = validateResponse(response)
        if (!validation.valid) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: "Validation failed" }) + "\n"))
          controller.close()
          return
        }

        // Stream in chunks (simulate progressive rendering)
        // Chunk 1: Schema + tracing
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              schemaVersion: response.schemaVersion,
              requestId: response.requestId,
              traceId: response.traceId,
              kind: response.kind,
              topic: response.topic,
              surface: response.surface,
              createdAt: response.createdAt,
            }) + "\n"
          )
        )

        await delay(50) // Small delay for streaming effect

        // Chunk 2: Main content
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              requestId: response.requestId,
              headline: response.headline,
              directAnswer: response.directAnswer,
              confidence: response.confidence,
            }) + "\n"
          )
        )

        await delay(50)

        // Chunk 3: Citations (if present)
        if (response.citations) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                requestId: response.requestId,
                citations: response.citations,
              }) + "\n"
            )
          )
          await delay(50)
        }

        // Chunk 4: Refusal details (if present)
        if (response.refusalReason) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                requestId: response.requestId,
                refusalReason: response.refusalReason,
                refusal: response.refusal,
              }) + "\n"
            )
          )
        }

        // Chunk 5: Related questions
        if (response.relatedQuestions) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                requestId: response.requestId,
                relatedQuestions: response.relatedQuestions,
              }) + "\n"
            )
          )
        }

        // Final chunk: done signal
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              requestId: response.requestId,
              _done: true,
            }) + "\n"
          )
        )

        controller.close()
      } catch (error) {
        console.error("Streaming error:", error)
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Internal error" }) + "\n"))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
