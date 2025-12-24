import { describe, it, expect, vi } from "vitest"
import { POST } from "../route"
import { NextRequest } from "next/server"

describe("POST /api/assistant/chat", () => {
  it("returns 400 for missing query", async () => {
    const request = new NextRequest("http://localhost/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe("Query is required")
  })

  it("returns 400 for invalid surface", async () => {
    const request = new NextRequest("http://localhost/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ query: "test", surface: "INVALID" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it("returns structured response for valid request", async () => {
    const request = new NextRequest("http://localhost/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ query: "What is VAT rate?", surface: "MARKETING" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.schemaVersion).toBe("1.0.0")
    expect(data.requestId).toBeTruthy()
    expect(data.surface).toBe("MARKETING")
  })
})
