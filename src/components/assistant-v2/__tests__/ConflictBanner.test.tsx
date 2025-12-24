import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConflictBanner } from "../ConflictBanner"
import type { ConflictBlock } from "@/lib/assistant"

describe("ConflictBanner", () => {
  const resolvedConflict: ConflictBlock = {
    status: "RESOLVED",
    description: "Previously conflicting guidance has been resolved.",
    resolvedAt: "2024-12-20",
    sources: [],
    winningSourceId: "src_1",
  }

  const unresolvedConflict: ConflictBlock = {
    status: "UNRESOLVED",
    description: "Multiple sources provide different guidance.",
    sources: [],
  }

  const contextDependentConflict: ConflictBlock = {
    status: "CONTEXT_DEPENDENT",
    description: "The answer depends on your specific situation.",
    sources: [],
  }

  it("renders resolved conflict with subtle styling", () => {
    render(<ConflictBanner conflict={resolvedConflict} />)

    expect(screen.getByText(/previously conflicting/i)).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveClass("bg-muted/50")
  })

  it("renders unresolved conflict with warning styling", () => {
    render(<ConflictBanner conflict={unresolvedConflict} />)

    expect(screen.getByText(/multiple sources/i)).toBeInTheDocument()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("renders context-dependent conflict with info styling", () => {
    render(<ConflictBanner conflict={contextDependentConflict} />)

    expect(screen.getByText(/depends on your specific/i)).toBeInTheDocument()
  })

  it("shows resolved date when provided", () => {
    render(<ConflictBanner conflict={resolvedConflict} />)

    expect(screen.getByText(/resolved on/i)).toBeInTheDocument()
  })

  it("renders nothing when conflict is null", () => {
    const { container } = render(<ConflictBanner conflict={null} />)

    expect(container.firstChild).toBeNull()
  })

  it('uses role="status" for resolved conflicts', () => {
    render(<ConflictBanner conflict={resolvedConflict} />)

    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it('uses role="alert" for unresolved conflicts', () => {
    render(<ConflictBanner conflict={unresolvedConflict} />)

    expect(screen.getByRole("alert")).toBeInTheDocument()
  })
})
