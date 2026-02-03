import { z } from 'zod';
import { router, protectedProcedure } from '../index';
import { createInvoiceSchema } from '@fiskai/shared/schemas';
import { formatInvoiceNumber } from '@fiskai/shared';

export const invoiceRouter = router({
  // List invoices for a company
  list: protectedProcedure
    .input(z.object({
      companyId: z.string().cuid(),
      status: z.enum(['DRAFT', 'ISSUED', 'SENT', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'CANCELLED']).optional(),
      year: z.number().int().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to company
      const company = await ctx.db.company.findFirst({
        where: {
          id: input.companyId,
          members: {
            some: { userId: ctx.userId },
          },
        },
      });

      if (!company) {
        throw new Error('UNAUTHORIZED');
      }

      return ctx.db.invoice.findMany({
        where: {
          companyId: input.companyId,
          status: input.status,
          year: input.year,
        },
        include: {
          contact: true,
          businessPremises: true,
          paymentDevice: true,
          lines: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Get single invoice
  get: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.invoice.findFirst({
        where: {
          id: input.id,
          company: {
            members: {
              some: { userId: ctx.userId },
            },
          },
        },
        include: {
          contact: true,
          businessPremises: true,
          paymentDevice: true,
          lines: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    }),

  // Create invoice
  create: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const { lines, ...invoiceData } = input;

      // Verify user has access to company
      const company = await ctx.db.company.findFirst({
        where: {
          id: input.companyId,
          members: {
            some: { userId: ctx.userId },
          },
        },
      });

      if (!company) {
        throw new Error('UNAUTHORIZED');
      }

      // Get business premises and payment device codes
      const premises = await ctx.db.businessPremises.findUnique({
        where: { id: input.businessPremisesId },
      });
      const device = await ctx.db.paymentDevice.findUnique({
        where: { id: input.paymentDeviceId },
      });

      if (!premises || !device) {
        throw new Error('Invalid business premises or payment device');
      }

      // Get or create invoice sequence
      const year = input.issueDate.getFullYear();
      const sequence = await ctx.db.invoiceSequence.upsert({
        where: {
          companyId_businessPremisesId_paymentDeviceId_year: {
            companyId: input.companyId,
            businessPremisesId: input.businessPremisesId,
            paymentDeviceId: input.paymentDeviceId,
            year,
          },
        },
        create: {
          companyId: input.companyId,
          businessPremisesId: input.businessPremisesId,
          paymentDeviceId: input.paymentDeviceId,
          year,
          lastNumber: 1,
        },
        update: {
          lastNumber: { increment: 1 },
        },
      });

      const invoiceNumber = sequence.lastNumber;
      const invoiceNumberFull = formatInvoiceNumber(
        invoiceNumber,
        premises.code,
        device.code
      );

      // Calculate line totals
      let subtotalCents = 0;
      let vatAmountCents = 0;

      const processedLines = lines.map((line, index) => {
        const lineTotal = Math.round((line.quantity / 100) * line.unitPriceCents);
        const lineVat = Math.round(lineTotal * (line.vatRate / 100));

        subtotalCents += lineTotal;
        vatAmountCents += lineVat;

        return {
          description: line.description,
          quantity: Math.round(line.quantity * 100), // Store as integer * 100
          unitPrice: line.unitPriceCents,
          vatRate: line.vatRate,
          lineTotalCents: lineTotal,
          vatAmountCents: lineVat,
          sortOrder: index,
        };
      });

      const totalCents = subtotalCents + vatAmountCents;

      // Create invoice with lines
      return ctx.db.invoice.create({
        data: {
          ...invoiceData,
          invoiceNumber,
          invoiceNumberFull,
          year,
          subtotalCents,
          vatAmountCents,
          totalCents,
          lines: {
            create: processedLines,
          },
        },
        include: {
          lines: true,
        },
      });
    }),

  // Issue invoice (change status from DRAFT to ISSUED)
  issue: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: {
          id: input.id,
          status: 'DRAFT',
          company: {
            members: {
              some: { userId: ctx.userId },
            },
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found or already issued');
      }

      return ctx.db.invoice.update({
        where: { id: input.id },
        data: { status: 'ISSUED' },
      });
    }),
});
