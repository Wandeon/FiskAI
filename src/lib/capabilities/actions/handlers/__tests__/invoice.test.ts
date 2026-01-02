/**
 * Invoice Action Handlers Tests
 *
 * Tests for invoice-related action handlers that wrap existing server actions.
 *
 * @module capabilities/actions/handlers
 * @since PHASE 2 - Capability-Driven Actions
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { clearRegistry, getActionHandler } from "../../registry"
import type { ActionContext } from "../../types"

// Mock the server actions before importing the handlers
vi.mock("@/app/actions/invoice", () => ({
  sendInvoiceEmail: vi.fn(),
  sendEInvoice: vi.fn(),
  createCreditNote: vi.fn(),
}))

vi.mock("@/app/actions/fiscalize", () => ({
  fiscalizeInvoice: vi.fn(),
}))

// Import mocked functions for test assertions
import { sendInvoiceEmail, sendEInvoice, createCreditNote } from "@/app/actions/invoice"
import { fiscalizeInvoice } from "@/app/actions/fiscalize"

// Import handlers to register them
import "../invoice"

// Cast mocks to allow assertions
const mockSendInvoiceEmail = sendInvoiceEmail as ReturnType<typeof vi.fn>
const mockSendEInvoice = sendEInvoice as ReturnType<typeof vi.fn>
const mockCreateCreditNote = createCreditNote as ReturnType<typeof vi.fn>
const mockFiscalizeInvoice = fiscalizeInvoice as ReturnType<typeof vi.fn>

// Helper to create mock context
function createContext(): ActionContext {
  return {
    userId: "user-123",
    companyId: "company-456",
    permissions: ["invoice:update", "invoice:fiscalize", "invoice:create"],
  }
}

describe("Invoice Action Handlers", () => {
  beforeEach(() => {
    // Clear all mocks between tests
    vi.clearAllMocks()
  })

  describe("INV-002:send_email handler", () => {
    it("should be registered in the registry", () => {
      const entry = getActionHandler("INV-002", "send_email")
      expect(entry).toBeDefined()
      expect(entry?.permission).toBe("invoice:update")
    })

    it("should return validation error when id is missing", async () => {
      const entry = getActionHandler("INV-002", "send_email")
      const context = createContext()

      const result = await entry!.handler(context, {})

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invoice ID required")
      expect(result.code).toBe("VALIDATION_ERROR")
      expect(mockSendInvoiceEmail).not.toHaveBeenCalled()
    })

    it("should return validation error when params is undefined", async () => {
      const entry = getActionHandler("INV-002", "send_email")
      const context = createContext()

      const result = await entry!.handler(context, undefined)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invoice ID required")
      expect(result.code).toBe("VALIDATION_ERROR")
    })

    it("should call sendInvoiceEmail with invoice ID and return success", async () => {
      mockSendInvoiceEmail.mockResolvedValue({ success: "Email sent successfully" })

      const entry = getActionHandler("INV-002", "send_email")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(true)
      expect(mockSendInvoiceEmail).toHaveBeenCalledWith("invoice-789")
    })

    it("should return error when sendInvoiceEmail fails", async () => {
      mockSendInvoiceEmail.mockResolvedValue({ error: "Buyer does not have an email address" })

      const entry = getActionHandler("INV-002", "send_email")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Buyer does not have an email address")
    })

    it("should return generic error message when no error provided", async () => {
      mockSendInvoiceEmail.mockResolvedValue({})

      const entry = getActionHandler("INV-002", "send_email")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to send email")
    })
  })

  describe("INV-002:send_einvoice handler", () => {
    it("should be registered in the registry", () => {
      const entry = getActionHandler("INV-002", "send_einvoice")
      expect(entry).toBeDefined()
      expect(entry?.permission).toBe("invoice:update")
    })

    it("should return validation error when id is missing", async () => {
      const entry = getActionHandler("INV-002", "send_einvoice")
      const context = createContext()

      const result = await entry!.handler(context, {})

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invoice ID required")
      expect(result.code).toBe("VALIDATION_ERROR")
      expect(mockSendEInvoice).not.toHaveBeenCalled()
    })

    it("should call sendEInvoice with invoice ID and return success", async () => {
      mockSendEInvoice.mockResolvedValue({ success: "E-Invoice sent successfully" })

      const entry = getActionHandler("INV-002", "send_einvoice")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(true)
      expect(mockSendEInvoice).toHaveBeenCalledWith("invoice-789")
    })

    it("should return error when sendEInvoice fails", async () => {
      mockSendEInvoice.mockResolvedValue({ error: "E-Invoice not found or already sent" })

      const entry = getActionHandler("INV-002", "send_einvoice")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("E-Invoice not found or already sent")
    })

    it("should return generic error message when no error provided", async () => {
      mockSendEInvoice.mockResolvedValue({})

      const entry = getActionHandler("INV-002", "send_einvoice")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to send e-invoice")
    })
  })

  describe("INV-003:fiscalize handler", () => {
    it("should be registered in the registry", () => {
      const entry = getActionHandler("INV-003", "fiscalize")
      expect(entry).toBeDefined()
      expect(entry?.permission).toBe("invoice:fiscalize")
    })

    it("should return validation error when id is missing", async () => {
      const entry = getActionHandler("INV-003", "fiscalize")
      const context = createContext()

      const result = await entry!.handler(context, {})

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invoice ID required")
      expect(result.code).toBe("VALIDATION_ERROR")
      expect(mockFiscalizeInvoice).not.toHaveBeenCalled()
    })

    it("should call fiscalizeInvoice with invoice ID and return success with data", async () => {
      mockFiscalizeInvoice.mockResolvedValue({
        success: true,
        jir: "abc123-jir-456",
        zki: "xyz789-zki-012",
      })

      const entry = getActionHandler("INV-003", "fiscalize")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ jir: "abc123-jir-456", zki: "xyz789-zki-012" })
      expect(mockFiscalizeInvoice).toHaveBeenCalledWith("invoice-789")
    })

    it("should return error when fiscalizeInvoice fails", async () => {
      mockFiscalizeInvoice.mockResolvedValue({
        success: false,
        error: "Nije konfiguriran poslovni prostor",
      })

      const entry = getActionHandler("INV-003", "fiscalize")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Nije konfiguriran poslovni prostor")
    })

    it("should return generic error message when no error provided", async () => {
      mockFiscalizeInvoice.mockResolvedValue({ success: false })

      const entry = getActionHandler("INV-003", "fiscalize")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to fiscalize invoice")
    })
  })

  describe("INV-004:create_credit_note handler", () => {
    it("should be registered in the registry", () => {
      const entry = getActionHandler("INV-004", "create_credit_note")
      expect(entry).toBeDefined()
      expect(entry?.permission).toBe("invoice:create")
    })

    it("should return validation error when id is missing", async () => {
      const entry = getActionHandler("INV-004", "create_credit_note")
      const context = createContext()

      const result = await entry!.handler(context, {})

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invoice ID required")
      expect(result.code).toBe("VALIDATION_ERROR")
      expect(mockCreateCreditNote).not.toHaveBeenCalled()
    })

    it("should call createCreditNote with invoice ID and return success with data", async () => {
      mockCreateCreditNote.mockResolvedValue({
        success: true,
        data: { id: "credit-note-123" },
      })

      const entry = getActionHandler("INV-004", "create_credit_note")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: "credit-note-123" })
      expect(mockCreateCreditNote).toHaveBeenCalledWith("invoice-789", undefined)
    })

    it("should pass reason parameter to createCreditNote", async () => {
      mockCreateCreditNote.mockResolvedValue({
        success: true,
        data: { id: "credit-note-123" },
      })

      const entry = getActionHandler("INV-004", "create_credit_note")
      const context = createContext()

      const result = await entry!.handler(context, {
        id: "invoice-789",
        reason: "Customer returned goods",
      })

      expect(result.success).toBe(true)
      expect(mockCreateCreditNote).toHaveBeenCalledWith("invoice-789", "Customer returned goods")
    })

    it("should return error when createCreditNote fails", async () => {
      mockCreateCreditNote.mockResolvedValue({
        success: false,
        error: "Storno je moguće tek nakon izdavanja računa",
      })

      const entry = getActionHandler("INV-004", "create_credit_note")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Storno je moguće tek nakon izdavanja računa")
    })

    it("should return generic error message when no error provided", async () => {
      mockCreateCreditNote.mockResolvedValue({ success: false })

      const entry = getActionHandler("INV-004", "create_credit_note")
      const context = createContext()

      const result = await entry!.handler(context, { id: "invoice-789" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create credit note")
    })
  })

  describe("handler isolation", () => {
    it("should not affect other handlers when one fails", async () => {
      // Set up one handler to fail, others to succeed
      mockSendInvoiceEmail.mockResolvedValue({ error: "Email failed" })
      mockSendEInvoice.mockResolvedValue({ success: "E-Invoice sent" })
      mockFiscalizeInvoice.mockResolvedValue({ success: true, jir: "jir-123" })
      mockCreateCreditNote.mockResolvedValue({ success: true, data: { id: "cn-123" } })

      const context = createContext()

      const emailResult = await getActionHandler("INV-002", "send_email")!.handler(context, {
        id: "inv-1",
      })
      const eInvoiceResult = await getActionHandler("INV-002", "send_einvoice")!.handler(context, {
        id: "inv-2",
      })
      const fiscalResult = await getActionHandler("INV-003", "fiscalize")!.handler(context, {
        id: "inv-3",
      })
      const creditResult = await getActionHandler("INV-004", "create_credit_note")!.handler(
        context,
        { id: "inv-4" }
      )

      expect(emailResult.success).toBe(false)
      expect(eInvoiceResult.success).toBe(true)
      expect(fiscalResult.success).toBe(true)
      expect(creditResult.success).toBe(true)
    })
  })
})
