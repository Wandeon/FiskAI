import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { LegacyBanner } from "../LegacyBanner"

describe("LegacyBanner", () => {
  it("renders warning banner with link to control center", () => {
    render(<LegacyBanner />)

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByText(/legacy/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /control center/i })).toHaveAttribute(
      "href",
      "/control-center"
    )
  })

  it("shows custom message when provided", () => {
    render(<LegacyBanner message="This page is read-only" />)

    expect(screen.getByText(/read-only/i)).toBeInTheDocument()
  })
})
