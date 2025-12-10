import { z } from "zod"

// Croatian OIB validation (11 digits with checksum)
const oibRegex = /^\d{11}$/

export const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  oib: z.string().regex(oibRegex, "OIB must be exactly 11 digits"),
  vatNumber: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().default("HR"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  iban: z.string().optional(),
  isVatPayer: z.boolean().default(false),
})

export const companySettingsSchema = z.object({
  eInvoiceProvider: z.enum(["ie-racuni", "fina", "ddd-invoices"]).optional(),
  eInvoiceApiKey: z.string().optional(),
})

export type CompanyInput = z.infer<typeof companySchema>
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>
