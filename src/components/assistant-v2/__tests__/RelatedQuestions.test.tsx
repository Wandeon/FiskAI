import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RelatedQuestions } from "../RelatedQuestions"

describe("RelatedQuestions", () => {
  const questions = [
    "When do I become VAT-registered?",
    "What are reduced VAT rates?",
    "How do I file VAT returns?",
  ]

  it("renders all questions as chips", () => {
    render(<RelatedQuestions questions={questions} onSelect={vi.fn()} />)

    expect(screen.getByText(/When do I become/)).toBeInTheDocument()
    expect(screen.getByText(/What are reduced/)).toBeInTheDocument()
    expect(screen.getByText(/How do I file/)).toBeInTheDocument()
  })

  it("renders header", () => {
    render(<RelatedQuestions questions={questions} onSelect={vi.fn()} />)

    expect(screen.getByText(/related questions/i)).toBeInTheDocument()
  })

  it("calls onSelect with question text when clicked (fill-only)", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(<RelatedQuestions questions={questions} onSelect={onSelect} />)

    await user.click(screen.getByText(/When do I become/))

    expect(onSelect).toHaveBeenCalledWith("When do I become VAT-registered?")
  })

  it("renders nothing when questions is empty", () => {
    const { container } = render(<RelatedQuestions questions={[]} onSelect={vi.fn()} />)

    expect(container.firstChild).toBeNull()
  })

  it("truncates long questions", () => {
    const longQuestions = [
      "This is a very long question that exceeds eighty characters and should be truncated with an ellipsis",
    ]

    render(<RelatedQuestions questions={longQuestions} onSelect={vi.fn()} />)

    const chip = screen.getByRole("button")
    expect(chip.textContent?.length).toBeLessThanOrEqual(83) // 80 + "..."
  })

  it("limits to max 4 questions", () => {
    const manyQuestions = [
      "Question 1",
      "Question 2",
      "Question 3",
      "Question 4",
      "Question 5",
      "Question 6",
    ]

    render(<RelatedQuestions questions={manyQuestions} onSelect={vi.fn()} />)

    const chips = screen.getAllByRole("button")
    expect(chips).toHaveLength(4)
  })
})
