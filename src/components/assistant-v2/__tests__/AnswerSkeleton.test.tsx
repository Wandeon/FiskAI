// src/components/assistant-v2/__tests__/AnswerSkeleton.test.tsx
import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AnswerSkeleton } from "../AnswerSkeleton"

describe("AnswerSkeleton", () => {
  it("renders headline skeleton", () => {
    render(<AnswerSkeleton />)

    expect(screen.getByTestId("skeleton-headline")).toBeInTheDocument()
  })

  it("renders direct answer skeleton lines", () => {
    render(<AnswerSkeleton />)

    expect(screen.getByTestId("skeleton-answer-1")).toBeInTheDocument()
    expect(screen.getByTestId("skeleton-answer-2")).toBeInTheDocument()
  })

  it("renders button placeholders", () => {
    render(<AnswerSkeleton />)

    expect(screen.getByTestId("skeleton-button-1")).toBeInTheDocument()
    expect(screen.getByTestId("skeleton-button-2")).toBeInTheDocument()
  })

  it("has aria-hidden for screen readers", () => {
    render(<AnswerSkeleton />)

    const skeleton = screen.getByTestId("answer-skeleton-container")
    expect(skeleton).toHaveAttribute("aria-hidden", "true")
  })

  it("respects prefers-reduced-motion via CSS class", () => {
    render(<AnswerSkeleton />)

    // Check individual skeleton elements (not the container)
    expect(screen.getByTestId("skeleton-headline").className).toContain("motion-safe:animate-pulse")
    expect(screen.getByTestId("skeleton-answer-1").className).toContain("motion-safe:animate-pulse")
    expect(screen.getByTestId("skeleton-answer-2").className).toContain("motion-safe:animate-pulse")
    expect(screen.getByTestId("skeleton-button-1").className).toContain("motion-safe:animate-pulse")
    expect(screen.getByTestId("skeleton-button-2").className).toContain("motion-safe:animate-pulse")
  })
})
