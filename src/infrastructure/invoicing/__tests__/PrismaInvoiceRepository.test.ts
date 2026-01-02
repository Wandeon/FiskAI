// src/infrastructure/invoicing/__tests__/PrismaInvoiceRepository.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma, EInvoiceStatus } from "@prisma/client"
import { Invoice, InvoiceId, InvoiceNumber, InvoiceStatus, InvoiceLine } from "@/domain/invoicing"
import { Money, Quantity, VatRate } from "@/domain/shared"

// Mock Prisma client - must be declared inside the factory function
vi.mock("@/lib/db", () => ({
  prisma: {
    eInvoice: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    eInvoiceLine: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}))

// Import the mocked module after mocking
import { prisma } from "@/lib/db"
import { PrismaInvoiceRepository } from "../PrismaInvoiceRepository"

// Type the mock for better type safety
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any

describe("PrismaInvoiceRepository", () => {
  let repository: PrismaInvoiceRepository

  beforeEach(() => {
    repository = new PrismaInvoiceRepository()
    vi.clearAllMocks()
  })

  describe("save", () => {
    it("saves a new draft invoice", async () => {
      const invoice = Invoice.create("buyer-123", "seller-456")
      mockPrisma.eInvoice.upsert.mockResolvedValue({})
      mockPrisma.eInvoice.findUnique.mockResolvedValue({ id: invoice.id.toString() })
      mockPrisma.eInvoiceLine.deleteMany.mockResolvedValue({})

      await repository.save(invoice)

      expect(mockPrisma.eInvoice.upsert).toHaveBeenCalledTimes(1)
      expect(mockPrisma.eInvoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: invoice.id.toString() },
          create: expect.objectContaining({
            buyerId: "buyer-123",
            sellerId: "seller-456",
            status: EInvoiceStatus.DRAFT,
          }),
        })
      )
    })

    it("saves invoice with lines", async () => {
      const invoice = Invoice.create("buyer-123", "seller-456")
      const line = InvoiceLine.create({
        description: "Test product",
        quantity: Quantity.of(2),
        unitPrice: Money.fromString("100.00"),
        vatRate: VatRate.standard("25"),
      })
      invoice.addLine(line)

      mockPrisma.eInvoice.upsert.mockResolvedValue({})
      mockPrisma.eInvoice.findUnique.mockResolvedValue({ id: invoice.id.toString() })
      mockPrisma.eInvoiceLine.deleteMany.mockResolvedValue({})
      mockPrisma.eInvoiceLine.createMany.mockResolvedValue({})

      await repository.save(invoice)

      expect(mockPrisma.eInvoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            lines: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  description: "Test product",
                }),
              ]),
            }),
          }),
        })
      )
    })

    it("uses DRAFT- prefix for invoice number when not yet issued", async () => {
      const invoice = Invoice.create("buyer-123", "seller-456")

      mockPrisma.eInvoice.upsert.mockResolvedValue({})
      mockPrisma.eInvoice.findUnique.mockResolvedValue({ id: invoice.id.toString() })
      mockPrisma.eInvoiceLine.deleteMany.mockResolvedValue({})

      await repository.save(invoice)

      expect(mockPrisma.eInvoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            invoiceNumber: expect.stringContaining("DRAFT-"),
          }),
        })
      )
    })

    it("maps CANCELED status to REJECTED for database", async () => {
      const invoice = Invoice.create("buyer-123", "seller-456")
      invoice.cancel()

      mockPrisma.eInvoice.upsert.mockResolvedValue({})
      mockPrisma.eInvoice.findUnique.mockResolvedValue({ id: invoice.id.toString() })
      mockPrisma.eInvoiceLine.deleteMany.mockResolvedValue({})

      await repository.save(invoice)

      expect(mockPrisma.eInvoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: EInvoiceStatus.REJECTED,
          }),
        })
      )
    })

    it("deletes old lines and creates new ones on update", async () => {
      const invoice = Invoice.create("buyer-123", "seller-456")
      const line = InvoiceLine.create({
        description: "Updated product",
        quantity: Quantity.of(1),
        unitPrice: Money.fromString("50.00"),
        vatRate: VatRate.standard("25"),
      })
      invoice.addLine(line)

      mockPrisma.eInvoice.upsert.mockResolvedValue({})
      mockPrisma.eInvoice.findUnique.mockResolvedValue({ id: invoice.id.toString() })
      mockPrisma.eInvoiceLine.deleteMany.mockResolvedValue({})
      mockPrisma.eInvoiceLine.createMany.mockResolvedValue({})

      await repository.save(invoice)

      expect(mockPrisma.eInvoiceLine.deleteMany).toHaveBeenCalledWith({
        where: { eInvoiceId: invoice.id.toString() },
      })
      expect(mockPrisma.eInvoiceLine.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              eInvoiceId: invoice.id.toString(),
              description: "Updated product",
            }),
          ]),
        })
      )
    })
  })

  describe("findById", () => {
    it("returns null when invoice not found", async () => {
      const id = InvoiceId.fromString("non-existent-id")
      mockPrisma.eInvoice.findUnique.mockResolvedValue(null)

      const result = await repository.findById(id)

      expect(result).toBeNull()
      expect(mockPrisma.eInvoice.findUnique).toHaveBeenCalledWith({
        where: { id: "non-existent-id" },
        include: { lines: true },
      })
    })

    it("reconstitutes invoice from database record", async () => {
      const id = InvoiceId.fromString("inv-123")
      mockPrisma.eInvoice.findUnique.mockResolvedValue({
        id: "inv-123",
        companyId: "company-456",
        sellerId: "seller-456",
        buyerId: "buyer-789",
        invoiceNumber: "1-1-1",
        issueDate: new Date("2024-01-15"),
        dueDate: new Date("2024-02-15"),
        status: EInvoiceStatus.DRAFT,
        jir: null,
        zki: null,
        fiscalizedAt: null,
        lines: [],
      })

      const result = await repository.findById(id)

      expect(result).not.toBeNull()
      expect(result!.id.toString()).toBe("inv-123")
      expect(result!.buyerId).toBe("buyer-789")
      expect(result!.sellerId).toBe("seller-456")
      expect(result!.status).toBe(InvoiceStatus.DRAFT)
    })

    it("reconstitutes invoice with lines", async () => {
      const id = InvoiceId.fromString("inv-123")
      mockPrisma.eInvoice.findUnique.mockResolvedValue({
        id: "inv-123",
        companyId: "company-456",
        sellerId: "seller-456",
        buyerId: "buyer-789",
        invoiceNumber: "1-1-1",
        issueDate: new Date("2024-01-15"),
        dueDate: new Date("2024-02-15"),
        status: EInvoiceStatus.FISCALIZED,
        jir: "JIR-123",
        zki: "ZKI-456",
        fiscalizedAt: new Date("2024-01-15"),
        lines: [
          {
            id: "line-1",
            description: "Product A",
            quantity: new Prisma.Decimal("2"),
            unitPrice: new Prisma.Decimal("100.00"),
            netAmount: new Prisma.Decimal("200.00"),
            vatRate: new Prisma.Decimal("0.25"),
            vatAmount: new Prisma.Decimal("50.00"),
          },
        ],
      })

      const result = await repository.findById(id)

      expect(result).not.toBeNull()
      const lines = result!.getLines()
      expect(lines).toHaveLength(1)
      expect(lines[0].description).toBe("Product A")
      expect(lines[0].quantity.toNumber()).toBe(2)
    })

    it("maps REJECTED status to CANCELED", async () => {
      const id = InvoiceId.fromString("inv-123")
      mockPrisma.eInvoice.findUnique.mockResolvedValue({
        id: "inv-123",
        companyId: "company-456",
        sellerId: "seller-456",
        buyerId: "buyer-789",
        invoiceNumber: "DRAFT-inv-123",
        issueDate: new Date("2024-01-15"),
        dueDate: null,
        status: EInvoiceStatus.REJECTED,
        jir: null,
        zki: null,
        fiscalizedAt: null,
        lines: [],
      })

      const result = await repository.findById(id)

      expect(result!.status).toBe(InvoiceStatus.CANCELED)
    })

    it("maps ERROR status to DRAFT as fallback", async () => {
      const id = InvoiceId.fromString("inv-123")
      mockPrisma.eInvoice.findUnique.mockResolvedValue({
        id: "inv-123",
        companyId: "company-456",
        sellerId: "seller-456",
        buyerId: "buyer-789",
        invoiceNumber: "DRAFT-inv-123",
        issueDate: new Date("2024-01-15"),
        dueDate: null,
        status: EInvoiceStatus.ERROR,
        jir: null,
        zki: null,
        fiscalizedAt: null,
        lines: [],
      })

      const result = await repository.findById(id)

      expect(result!.status).toBe(InvoiceStatus.DRAFT)
    })

    it("handles DRAFT- prefix in invoice number", async () => {
      const id = InvoiceId.fromString("inv-123")
      mockPrisma.eInvoice.findUnique.mockResolvedValue({
        id: "inv-123",
        companyId: "company-456",
        sellerId: "seller-456",
        buyerId: "buyer-789",
        invoiceNumber: "DRAFT-inv-123",
        issueDate: new Date("2024-01-15"),
        dueDate: null,
        status: EInvoiceStatus.DRAFT,
        jir: null,
        zki: null,
        fiscalizedAt: null,
        lines: [],
      })

      const result = await repository.findById(id)

      expect(result!.invoiceNumber).toBeUndefined()
    })
  })

  describe("findByNumber", () => {
    it("returns null when invoice not found", async () => {
      mockPrisma.eInvoice.findFirst.mockResolvedValue(null)

      const result = await repository.findByNumber("1-1-1", "company-123")

      expect(result).toBeNull()
      expect(mockPrisma.eInvoice.findFirst).toHaveBeenCalledWith({
        where: { invoiceNumber: "1-1-1", companyId: "company-123" },
        include: { lines: true },
      })
    })

    it("returns invoice when found by number and company", async () => {
      mockPrisma.eInvoice.findFirst.mockResolvedValue({
        id: "inv-123",
        companyId: "company-123",
        sellerId: "seller-456",
        buyerId: "buyer-789",
        invoiceNumber: "1-1-1",
        issueDate: new Date("2024-01-15"),
        dueDate: new Date("2024-02-15"),
        status: EInvoiceStatus.FISCALIZED,
        jir: "JIR-123",
        zki: "ZKI-456",
        fiscalizedAt: new Date("2024-01-15"),
        lines: [],
      })

      const result = await repository.findByNumber("1-1-1", "company-123")

      expect(result).not.toBeNull()
      expect(result!.invoiceNumber?.format()).toBe("1-1-1")
    })
  })

  describe("nextSequenceNumber", () => {
    it("returns count + 1 for sequence number", async () => {
      mockPrisma.eInvoice.count.mockResolvedValue(42)

      const result = await repository.nextSequenceNumber("company-123", 1, 1)

      expect(result).toBe(43)
    })

    it("returns 1 when no invoices exist", async () => {
      mockPrisma.eInvoice.count.mockResolvedValue(0)

      const result = await repository.nextSequenceNumber("company-123", 1, 1)

      expect(result).toBe(1)
    })

    it("excludes DRAFT invoices from count", async () => {
      mockPrisma.eInvoice.count.mockResolvedValue(5)

      await repository.nextSequenceNumber("company-123", 1, 1)

      expect(mockPrisma.eInvoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: "company-123",
            invoiceNumber: { not: { startsWith: "DRAFT-" } },
          }),
        })
      )
    })

    it("filters by current year", async () => {
      mockPrisma.eInvoice.count.mockResolvedValue(10)
      const currentYear = new Date().getFullYear()

      await repository.nextSequenceNumber("company-123", 1, 1)

      expect(mockPrisma.eInvoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: {
              gte: new Date(currentYear, 0, 1),
              lt: new Date(currentYear + 1, 0, 1),
            },
          }),
        })
      )
    })
  })
})
