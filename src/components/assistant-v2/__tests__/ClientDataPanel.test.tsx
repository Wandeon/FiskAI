import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ClientDataPanel } from "../ClientDataPanel"
import type { ClientContextBlock, ControllerStatus } from "@/lib/assistant"

const mockClientContext: ClientContextBlock = {
  used: [
    { label: "Revenue YTD", value: "€31,760", source: "Invoices", asOfDate: "2024-12-23" },
    { label: "VAT Threshold", value: "€40,000", source: "Regulatory rule", asOfDate: "2024-01-01" },
  ],
  completeness: {
    status: "COMPLETE",
    score: 0.92,
    notes: "2 invoices from November pending import",
  },
  assumptions: ["Using invoice issue date for revenue recognition"],
  missing: [],
  computedResult: {
    label: "Remaining until threshold",
    value: "€8,240",
    explanation: "€40,000 - €31,760 = €8,240",
  },
}

const partialContext: ClientContextBlock = {
  used: [{ label: "Revenue YTD", value: "€31,760", source: "Invoices" }],
  completeness: {
    status: "PARTIAL",
    score: 0.5,
    notes: "Missing bank connection",
  },
  assumptions: [],
  missing: [{ label: "Bank transactions", impact: "Cannot verify revenue accuracy" }],
}

describe("ClientDataPanel", () => {
  it('renders header "Your data"', () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByRole("heading", { name: /your data/i })).toBeInTheDocument()
  })

  it("renders data points used", () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/Revenue YTD/)).toBeInTheDocument()
    expect(screen.getAllByText(/€31,760/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Invoices/)).toBeInTheDocument()
  })

  it("renders computed result when present", () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/Remaining until threshold/)).toBeInTheDocument()
    expect(screen.getAllByText(/€8,240/).length).toBeGreaterThan(0)
  })

  it("renders completeness score", () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/92%/)).toBeInTheDocument()
  })

  it("renders completeness notes", () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/2 invoices from November/)).toBeInTheDocument()
  })

  it("renders assumptions", () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/invoice issue date/)).toBeInTheDocument()
  })

  it("renders missing data with connect CTA", () => {
    render(
      <ClientDataPanel clientContext={partialContext} status="COMPLETE" onConnectData={vi.fn()} />
    )

    expect(screen.getByText(/Bank transactions/)).toBeInTheDocument()
    expect(screen.getByText(/Cannot verify revenue/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument()
  })

  it("calls onConnectData when connect button clicked", async () => {
    const onConnectData = vi.fn()
    const user = userEvent.setup()

    render(
      <ClientDataPanel
        clientContext={partialContext}
        status="COMPLETE"
        onConnectData={onConnectData}
      />
    )

    await user.click(screen.getByRole("button", { name: /connect/i }))

    expect(onConnectData).toHaveBeenCalled()
  })

  it("renders placeholder when no client context", () => {
    render(<ClientDataPanel clientContext={undefined} status="IDLE" />)

    expect(screen.getByText(/your data will appear here/i)).toBeInTheDocument()
  })

  it("renders skeleton when LOADING", () => {
    render(<ClientDataPanel clientContext={undefined} status="LOADING" />)

    expect(screen.getByTestId("client-data-skeleton")).toBeInTheDocument()
  })

  it('shows "Still syncing..." for PARTIAL_COMPLETE status', () => {
    render(<ClientDataPanel clientContext={partialContext} status="PARTIAL_COMPLETE" />)

    expect(screen.getByText(/still syncing/i)).toBeInTheDocument()
  })

  it("has id for skip link target", () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(document.getElementById("assistant-client-data")).toBeInTheDocument()
  })
})
