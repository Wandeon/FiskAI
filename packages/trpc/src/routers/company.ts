import { z } from 'zod';
import { router, protectedProcedure } from '../index';
import { createCompanySchema, createBusinessPremisesSchema, createPaymentDeviceSchema } from '@fiskai/shared/schemas';

export const companyRouter = router({
  // Get user's companies
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.company.findMany({
      where: {
        members: {
          some: {
            userId: ctx.userId,
          },
        },
      },
      include: {
        businessPremises: {
          include: {
            paymentDevices: true,
          },
        },
      },
    });
  }),

  // Get single company
  get: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.company.findFirst({
        where: {
          id: input.id,
          members: {
            some: {
              userId: ctx.userId,
            },
          },
        },
        include: {
          businessPremises: {
            include: {
              paymentDevices: true,
            },
          },
        },
      });
    }),

  // Create company
  create: protectedProcedure
    .input(createCompanySchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.company.create({
        data: {
          ...input,
          members: {
            create: {
              userId: ctx.userId!,
              role: 'OWNER',
            },
          },
        },
      });
    }),

  // Create business premises
  createBusinessPremises: protectedProcedure
    .input(createBusinessPremisesSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to company
      const company = await ctx.db.company.findFirst({
        where: {
          id: input.companyId,
          members: {
            some: {
              userId: ctx.userId,
              role: { in: ['OWNER', 'ADMIN'] },
            },
          },
        },
      });

      if (!company) {
        throw new Error('UNAUTHORIZED');
      }

      return ctx.db.businessPremises.create({
        data: input,
      });
    }),

  // Create payment device
  createPaymentDevice: protectedProcedure
    .input(createPaymentDeviceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to business premises
      const premises = await ctx.db.businessPremises.findFirst({
        where: {
          id: input.businessPremisesId,
          company: {
            members: {
              some: {
                userId: ctx.userId,
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        },
      });

      if (!premises) {
        throw new Error('UNAUTHORIZED');
      }

      return ctx.db.paymentDevice.create({
        data: input,
      });
    }),
});
