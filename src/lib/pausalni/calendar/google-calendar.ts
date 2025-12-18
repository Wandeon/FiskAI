// src/lib/pausalni/calendar/google-calendar.ts

import { google, calendar_v3 } from "googleapis"
import { db } from "@/lib/db"
import { decryptSecret, decryptOptionalSecret } from "@/lib/secrets"
import { OBLIGATION_LABELS, CROATIAN_MONTHS_GENITIVE } from "../constants"

const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

interface CalendarEvent {
  obligationType: string
  periodMonth: number
  periodYear: number
  dueDate: string
  amount: string
}

interface SyncResult {
  success: boolean
  eventsCreated: number
  errors: string[]
}

/**
 * Get OAuth2 client configured with user's tokens
 */
async function getAuthenticatedCalendarClient(companyId: string) {
  // Find a Gmail connection for this company (it will have calendar scopes if user granted them)
  const connection = await db.emailConnection.findFirst({
    where: {
      companyId,
      provider: "GMAIL",
      status: "CONNECTED",
    },
  })

  if (!connection) {
    throw new Error("No Google account connected. Please connect Gmail first in Email Settings.")
  }

  // Check if connection has calendar scopes
  const hasCalendarScope = connection.scopes.some(
    (scope) =>
      scope.includes("calendar") ||
      scope === "https://www.googleapis.com/auth/calendar" ||
      scope === "https://www.googleapis.com/auth/calendar.events"
  )

  if (!hasCalendarScope) {
    throw new Error(
      "Calendar access not granted. Please reconnect your Google account and grant calendar permissions."
    )
  }

  // Decrypt tokens
  const refreshToken = decryptSecret(connection.refreshTokenEnc)
  const accessToken = connection.accessTokenEnc
    ? decryptOptionalSecret(connection.accessTokenEnc)
    : null

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  // Set credentials
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: accessToken || undefined,
  })

  // Check if token is expired and refresh if needed
  if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      // Update stored tokens
      await db.emailConnection.update({
        where: { id: connection.id },
        data: {
          accessTokenEnc: credentials.access_token
            ? (await import("@/lib/secrets")).encryptSecret(credentials.access_token)
            : null,
          tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      })
    } catch (error) {
      console.error("[google-calendar] Token refresh failed:", error)
      throw new Error("Failed to refresh Google access token. Please reconnect your account.")
    }
  }

  return google.calendar({ version: "v3", auth: oauth2Client })
}

/**
 * Create a calendar event for a payment obligation
 */
async function createCalendarEvent(
  calendarClient: calendar_v3.Calendar,
  event: CalendarEvent
): Promise<boolean> {
  try {
    const obligationLabel = OBLIGATION_LABELS[event.obligationType] || event.obligationType
    const monthName =
      event.periodMonth >= 1 && event.periodMonth <= 12
        ? CROATIAN_MONTHS_GENITIVE[event.periodMonth - 1]
        : `mjesec ${event.periodMonth}`

    // Parse due date
    const dueDate = new Date(event.dueDate)
    const dueDateStr = dueDate.toISOString().split("T")[0]

    // Format amount
    const amount = parseFloat(event.amount)
    const amountStr = amount > 0 ? `${amount.toFixed(2)} EUR` : "0.00 EUR"

    // Create event title
    const title = `[FiskAI] ${obligationLabel}`

    // Create event description
    const description = [
      `Paušalna obveza: ${obligationLabel}`,
      `Razdoblje: ${monthName} ${event.periodYear}`,
      amount > 0 ? `Iznos: ${amountStr}` : "",
      ``,
      `Rok plaćanja: ${dueDateStr}`,
      ``,
      `Kreirano automatski preko FiskAI Paušalni Compliance Hub.`,
    ]
      .filter(Boolean)
      .join("\n")

    // Create calendar event
    const calendarEvent: calendar_v3.Schema$Event = {
      summary: title,
      description,
      start: {
        date: dueDateStr,
      },
      end: {
        date: dueDateStr,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 7 * 24 * 60 }, // 7 days before
          { method: "popup", minutes: 3 * 24 * 60 }, // 3 days before
          { method: "popup", minutes: 24 * 60 }, // 1 day before
          { method: "popup", minutes: 60 }, // 1 hour before
        ],
      },
      colorId: "11", // Red color for deadlines
    }

    await calendarClient.events.insert({
      calendarId: "primary",
      requestBody: calendarEvent,
    })

    return true
  } catch (error) {
    console.error("[google-calendar] Failed to create event:", error)
    return false
  }
}

/**
 * Sync all payment obligations to Google Calendar
 */
export async function syncObligationsToGoogleCalendar(
  companyId: string,
  obligations: CalendarEvent[]
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    eventsCreated: 0,
    errors: [],
  }

  try {
    // Get authenticated calendar client
    const calendarClient = await getAuthenticatedCalendarClient(companyId)

    // Create events for each obligation
    for (const obligation of obligations) {
      const created = await createCalendarEvent(calendarClient, obligation)
      if (created) {
        result.eventsCreated++
      } else {
        result.errors.push(`Failed to create event for ${obligation.obligationType}`)
      }
    }

    result.success = result.eventsCreated > 0

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    result.errors.push(errorMessage)
    return result
  }
}

/**
 * Check if Google Calendar sync is available for a company
 */
export async function isGoogleCalendarAvailable(companyId: string): Promise<{
  available: boolean
  reason?: string
}> {
  try {
    const connection = await db.emailConnection.findFirst({
      where: {
        companyId,
        provider: "GMAIL",
        status: "CONNECTED",
      },
    })

    if (!connection) {
      return {
        available: false,
        reason: "No Google account connected",
      }
    }

    const hasCalendarScope = connection.scopes.some(
      (scope) =>
        scope.includes("calendar") ||
        scope === "https://www.googleapis.com/auth/calendar" ||
        scope === "https://www.googleapis.com/auth/calendar.events"
    )

    if (!hasCalendarScope) {
      return {
        available: false,
        reason: "Calendar access not granted",
      }
    }

    return { available: true }
  } catch (error) {
    console.error("[google-calendar] Error checking availability:", error)
    return {
      available: false,
      reason: "Failed to check calendar availability",
    }
  }
}
