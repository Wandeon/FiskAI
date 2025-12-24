import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { SCHEMA_VERSION, type Surface, type AssistantResponse } from "@/lib/assistant/types"

interface ChatRequest {
  query: string
  surface: Surface
  tenantId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest

    // Validate request
    if (!body.query || typeof body.query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    if (!body.surface || !["MARKETING", "APP"].includes(body.surface)) {
      return NextResponse.json({ error: "Invalid surface" }, { status: 400 })
    }

    const requestId = `req_${nanoid()}`
    const traceId = `trace_${nanoid()}`

    // TODO: Implement actual query processing
    // For now, return a mock response
    const response: AssistantResponse = {
      schemaVersion: SCHEMA_VERSION,
      requestId,
      traceId,
      kind: "ANSWER",
      topic: "REGULATORY",
      surface: body.surface,
      createdAt: new Date().toISOString(),
      headline: "This is a placeholder response.",
      directAnswer: "The actual implementation will query the regulatory rules database.",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Assistant chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
