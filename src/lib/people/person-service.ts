import type {
  Person,
  PersonContactRole,
  PersonDirectorRole,
  PersonEmployeeRole,
} from "@prisma/client"
import type { PersonInput } from "@/lib/validations/person"
import {
  normalizeAddress,
  normalizeIban,
  normalizeName,
  normalizeOptionalName,
  validateIbanOrThrow,
} from "@/lib/people/normalization"

export type PersonWithRoles = Person & {
  contactRoles: PersonContactRole[]
  employeeRoles: PersonEmployeeRole[]
  directorRoles: PersonDirectorRole[]
}

export type NormalizedPersonInput = {
  fullName: string
  normalizedFullName: string
  firstName: string | null
  lastName: string | null
  oib: string | null
  email: string | null
  phone: string | null
  iban: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  postalCode: string | null
  country: string
  roles?: PersonInput["roles"]
}

export function normalizePersonInput(input: PersonInput): NormalizedPersonInput {
  const { display, normalized } = normalizeName(input.fullName)
  const iban = normalizeIban(input.iban || null)
  validateIbanOrThrow(iban)

  return {
    fullName: display,
    normalizedFullName: normalized,
    firstName: normalizeOptionalName(input.firstName),
    lastName: normalizeOptionalName(input.lastName),
    oib: input.oib || null,
    email: normalizeOptionalName(input.email) ?? null,
    phone: normalizeOptionalName(input.phone) ?? null,
    iban,
    addressLine1: normalizeAddress(input.addressLine1),
    addressLine2: normalizeAddress(input.addressLine2),
    city: normalizeAddress(input.city),
    postalCode: normalizeAddress(input.postalCode),
    country: normalizeOptionalName(input.country)?.toUpperCase() ?? "HR",
    roles: input.roles,
  }
}

export function normalizePersonUpdate(
  input: Partial<PersonInput>,
  existing: Person
): NormalizedPersonInput {
  const fullName = input.fullName ?? existing.fullName
  const { display, normalized } = normalizeName(fullName)

  const iban = normalizeIban(input.iban === undefined ? existing.iban : input.iban || null)
  if (input.iban !== undefined) {
    validateIbanOrThrow(iban)
  }

  return {
    fullName: display,
    normalizedFullName: normalized,
    firstName: normalizeOptionalName(input.firstName ?? existing.firstName),
    lastName: normalizeOptionalName(input.lastName ?? existing.lastName),
    oib: (input.oib ?? existing.oib) || null,
    email: normalizeOptionalName(input.email ?? existing.email) ?? null,
    phone: normalizeOptionalName(input.phone ?? existing.phone) ?? null,
    iban,
    addressLine1: normalizeAddress(input.addressLine1 ?? existing.addressLine1),
    addressLine2: normalizeAddress(input.addressLine2 ?? existing.addressLine2),
    city: normalizeAddress(input.city ?? existing.city),
    postalCode: normalizeAddress(input.postalCode ?? existing.postalCode),
    country: normalizeOptionalName(input.country ?? existing.country)?.toUpperCase() ?? "HR",
    roles: input.roles,
  }
}

export function buildPersonSnapshot(person: PersonWithRoles) {
  return {
    person: {
      id: person.id,
      companyId: person.companyId,
      fullName: person.fullName,
      normalizedFullName: person.normalizedFullName,
      firstName: person.firstName,
      lastName: person.lastName,
      oib: person.oib,
      email: person.email,
      phone: person.phone,
      iban: person.iban,
      addressLine1: person.addressLine1,
      addressLine2: person.addressLine2,
      city: person.city,
      postalCode: person.postalCode,
      country: person.country,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    },
    roles: {
      contact: person.contactRoles,
      employee: person.employeeRoles,
      director: person.directorRoles,
    },
  }
}
