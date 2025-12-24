import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SourceCard } from "../SourceCard"
import type { SourceCard as SourceCardType } from "@/lib/assistant"

const mockSource: SourceCardType = {
  id: "src_1",
  title: "Zakon o porezu na dodanu vrijednost",
  authority: "LAW",
  reference: "čl. 38, st. 1",
  quote: "Standardna stopa poreza na dodanu vrijednost iznosi 25 posto.",
  pageNumber: 12,
  url: "https://narodne-novine.nn.hr/clanci/sluzbeni/2024_01_1_1.html",
  effectiveFrom: "2024-01-01",
  confidence: 0.98,
  status: "ACTIVE",
}

describe("SourceCard", () => {
  describe("expanded variant", () => {
    it("renders title", () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/Zakon o porezu/)).toBeInTheDocument()
    })

    it("renders authority badge", () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/law/i)).toBeInTheDocument()
    })

    it("renders reference", () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/čl\. 38/)).toBeInTheDocument()
    })

    it("renders quote excerpt", () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/Standardna stopa/)).toBeInTheDocument()
    })

    it("renders effective date", () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/2024/)).toBeInTheDocument()
    })

    it("renders confidence score", () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/98%/)).toBeInTheDocument()
    })

    it('renders "View source" link with page number', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      const link = screen.getByRole("link", { name: /view source/i })
      expect(link).toBeInTheDocument()
      expect(screen.getByText(/page 12/i)).toBeInTheDocument()
    })

    it("opens link in new tab", () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      const link = screen.getByRole("link", { name: /view source/i })
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("shows SUPERSEDED badge when status is SUPERSEDED", () => {
      const supersededSource = { ...mockSource, status: "SUPERSEDED" as const }
      render(<SourceCard source={supersededSource} variant="expanded" />)

      expect(screen.getByText(/superseded/i)).toBeInTheDocument()
    })
  })

  describe("compact variant", () => {
    it("renders title only", () => {
      render(<SourceCard source={mockSource} variant="compact" />)

      expect(screen.getByText(/Zakon o porezu/)).toBeInTheDocument()
      expect(screen.queryByText(/Standardna stopa/)).not.toBeInTheDocument()
    })

    it("renders authority badge", () => {
      render(<SourceCard source={mockSource} variant="compact" />)

      expect(screen.getByText(/law/i)).toBeInTheDocument()
    })

    it("does not render quote in compact mode", () => {
      render(<SourceCard source={mockSource} variant="compact" />)

      expect(screen.queryByText(/Standardna stopa/)).not.toBeInTheDocument()
    })
  })
})
