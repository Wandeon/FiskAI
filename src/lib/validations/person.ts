import { z } from "zod"
import { oibOptionalSchema } from "./oib"

export const personRoleSchema = z
  .object({
    contact: z
      .object({
        type: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]),
        paymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
        notes: z.string().optional(),
      })
      .nullable()
      .optional(),
    employee: z
      .object({
        jobTitle: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
      .nullable()
      .optional(),
    director: z
      .object({
        appointmentDate: z.coerce.date().optional(),
        resignationDate: z.coerce.date().optional(),
      })
      .nullable()
      .optional(),
  })
  .optional()

export const personSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  oib: oibOptionalSchema,
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  iban: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  roles: personRoleSchema,
})

export type PersonInput = z.infer<typeof personSchema>
