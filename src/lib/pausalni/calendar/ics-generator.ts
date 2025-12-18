import { createEvents, EventAttributes, DateArray } from "ics"
import { OBLIGATION_LABELS, CROATIAN_MONTHS_GENITIVE } from "../constants"

export interface PaymentObligation {
  id: string
  obligationType: string
  periodMonth: number
  periodYear: number
  amount: string
  dueDate: string
  status: string
}

interface GenerateICSOptions {
  obligations: PaymentObligation[]
  companyName?: string
}

interface GenerateICSResult {
  success: boolean
  icsContent?: string
  error?: string
}

/**
 * Convert a date string (YYYY-MM-DD) to ICS DateArray format [year, month, day]
 */
function dateStringToDateArray(dateString: string): DateArray {
  const date = new Date(dateString)
  // ICS months are 1-indexed
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
}

/**
 * Get a human-readable description for the obligation
 */
function getObligationDescription(obligation: PaymentObligation): string {
  const label = OBLIGATION_LABELS[obligation.obligationType] || obligation.obligationType
  const amount = parseFloat(obligation.amount)
  const periodMonth = CROATIAN_MONTHS_GENITIVE[obligation.periodMonth - 1]

  let description = `${label}`

  // Add period information
  if (obligation.obligationType.startsWith("DOPRINOSI_")) {
    description += ` za ${periodMonth} ${obligation.periodYear}`
  } else if (obligation.obligationType === "POREZ_DOHODAK") {
    description += ` - ${obligation.periodMonth}. kvartal ${obligation.periodYear}`
  } else if (obligation.obligationType === "PDV") {
    description += ` za ${periodMonth} ${obligation.periodYear}`
  } else if (obligation.obligationType === "HOK") {
    description += ` - ${obligation.periodMonth}. kvartal ${obligation.periodYear}`
  } else if (obligation.obligationType === "PO_SD") {
    description += ` za ${obligation.periodYear}`
  }

  // Add amount if > 0
  if (amount > 0) {
    description += `\n\nIznos: ${amount.toFixed(2)} EUR`
  }

  description += `\n\nRok plaćanja: ${new Date(obligation.dueDate).toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`

  // Add payment instructions
  if (obligation.obligationType.startsWith("DOPRINOSI_")) {
    description += `\n\nUplatiti putem HUB3A uplatnice ili internet bankarstva.`
  } else if (obligation.obligationType === "PDV") {
    description += `\n\nPDV obračun potrebno predati do 20. u mjesecu, a uplatiti do zadnjeg dana u mjesecu.`
  } else if (obligation.obligationType === "POREZ_DOHODAK") {
    description += `\n\nPorez na dohodak uplaćuje se nakon predaje obračuna.`
  } else if (obligation.obligationType === "PO_SD") {
    description += `\n\nGodišnji obrazac PO-SD predaje se do 15. siječnja za prethodnu godinu.`
  }

  return description
}

/**
 * Get event title for the obligation
 */
function getEventTitle(obligation: PaymentObligation): string {
  const label = OBLIGATION_LABELS[obligation.obligationType] || obligation.obligationType
  const amount = parseFloat(obligation.amount)

  if (amount > 0) {
    return `${label} (${amount.toFixed(2)} EUR)`
  }

  return label
}

/**
 * Generate ICS calendar file for payment obligations
 */
export function generateObligationsICS({
  obligations,
  companyName,
}: GenerateICSOptions): GenerateICSResult {
  if (!obligations || obligations.length === 0) {
    return {
      success: false,
      error: "No obligations provided",
    }
  }

  const events: EventAttributes[] = []

  for (const obligation of obligations) {
    const dueDate = dateStringToDateArray(obligation.dueDate)
    const title = getEventTitle(obligation)
    const description = getObligationDescription(obligation)

    // Create the main event (all-day event on due date)
    const event: EventAttributes = {
      start: dueDate,
      title,
      description,
      status: "CONFIRMED",
      busyStatus: "FREE",
      categories: ["Paušalni obrt", "Plaćanje"],
      uid: obligation.id,
      // Alarms for reminders
      alarms: [
        {
          action: "display" as const,
          description: `Podsjetnik: ${title}`,
          trigger: { days: 7, before: true },
        },
        {
          action: "display" as const,
          description: `Podsjetnik: ${title}`,
          trigger: { days: 3, before: true },
        },
        {
          action: "display" as const,
          description: `Podsjetnik: ${title}`,
          trigger: { days: 1, before: true },
        },
      ],
    }

    // Add organizer if company name provided
    if (companyName) {
      event.organizer = {
        name: companyName,
      }
    }

    events.push(event)
  }

  const { error, value } = createEvents(events)

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to generate ICS file",
    }
  }

  return {
    success: true,
    icsContent: value,
  }
}

/**
 * Generate ICS filename for the calendar export
 */
export function generateICSFilename(year: number, companyName?: string): string {
  const sanitizedCompanyName = companyName
    ? companyName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
    : "pausalni"
  return `${sanitizedCompanyName}_obveze_${year}.ics`
}
