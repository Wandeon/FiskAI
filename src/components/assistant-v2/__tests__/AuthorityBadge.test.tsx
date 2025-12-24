import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthorityBadge } from "../AuthorityBadge"
import type { AuthorityLevel } from "@/lib/assistant"

describe("AuthorityBadge", () => {
  it("renders LAW badge with correct styling", () => {
    render(<AuthorityBadge authority="LAW" />)

    const badge = screen.getByText(/law/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass("bg-purple-100", "text-purple-800")
  })

  it("renders REGULATION badge with correct styling", () => {
    render(<AuthorityBadge authority="REGULATION" />)

    const badge = screen.getByText(/regulation/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass("bg-blue-100", "text-blue-800")
  })

  it("renders GUIDANCE badge with correct styling", () => {
    render(<AuthorityBadge authority="GUIDANCE" />)

    const badge = screen.getByText(/guidance/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass("bg-green-100", "text-green-800")
  })

  it("renders PRACTICE badge with correct styling", () => {
    render(<AuthorityBadge authority="PRACTICE" />)

    const badge = screen.getByText(/practice/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass("bg-gray-100", "text-gray-800")
  })

  it("has accessible role", () => {
    render(<AuthorityBadge authority="LAW" />)

    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("has aria-label describing the authority level", () => {
    render(<AuthorityBadge authority="LAW" />)

    expect(screen.getByRole("status")).toHaveAttribute("aria-label", expect.stringContaining("Law"))
  })
})
