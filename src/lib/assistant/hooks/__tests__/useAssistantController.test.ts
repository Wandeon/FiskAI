/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useAssistantController } from "../useAssistantController"

describe("useAssistantController", () => {
  it("initializes with IDLE status", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    expect(result.current.state.status).toBe("IDLE")
    expect(result.current.state.activeQuery).toBeNull()
    expect(result.current.state.activeAnswer).toBeNull()
    expect(result.current.state.history).toEqual([])
    expect(result.current.state.error).toBeNull()
    expect(result.current.state.retryCount).toBe(0)
  })

  it("provides surface from props", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "APP" }))
    expect(result.current.surface).toBe("APP")
  })
})
