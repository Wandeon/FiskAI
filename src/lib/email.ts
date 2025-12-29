import nodemailer from "nodemailer"
import { render } from "@react-email/render"

/**
 * Email Service
 *
 * Prioritizes self-hosted SMTP (NodeMailer) over external service (Resend).
 * This reduces external dependencies while maintaining flexibility.
 *
 * Priority order:
 * 1. SMTP via NodeMailer (if SMTP_HOST is configured)
 * 2. Resend (if RESEND_API_KEY is configured)
 * 3. Log-only mode (development fallback)
 */

// SMTP Configuration (self-hosted, preferred)
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
}

// Resend Configuration (external service, fallback)
const resendApiKey = process.env.RESEND_API_KEY

// Determine which provider to use
type EmailProvider = "smtp" | "resend" | "none"

function getEmailProvider(): EmailProvider {
  if (smtpConfig.host && smtpConfig.auth.user) {
    return "smtp"
  }
  if (resendApiKey) {
    return "resend"
  }
  return "none"
}

// Create NodeMailer transporter
let transporter: nodemailer.Transporter | null = null

if (getEmailProvider() === "smtp") {
  transporter = nodemailer.createTransport(smtpConfig)
  console.info("[email] Using SMTP provider (self-hosted)")
} else if (getEmailProvider() === "resend") {
  console.info("[email] Using Resend provider (external service)")
} else {
  console.warn("[email] No email provider configured. Emails will be logged only.")
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: React.ReactElement
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
  from?: string
}

export interface SendEmailResult {
  success: boolean
  data?: { id?: string }
  error?: string
}

/**
 * Send email using the configured provider
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const provider = getEmailProvider()
  const from = options.from || process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "noreply@fiskai.app"

  // Render React component to HTML
  let html: string
  try {
    html = await render(options.react)
  } catch (renderError) {
    console.error("[email] Failed to render email template:", renderError)
    return {
      success: false,
      error: "Failed to render email template",
    }
  }

  if (provider === "smtp") {
    return sendViaSMTP(from, options, html)
  }

  if (provider === "resend") {
    return sendViaResend(from, options)
  }

  // No provider configured - log only in development
  console.log("[email] Would send email:", {
    from,
    to: options.to,
    subject: options.subject,
  })
  return {
    success: false,
    error: "Email service not configured. Please add SMTP_HOST or RESEND_API_KEY to environment variables.",
  }
}

/**
 * Send email via SMTP (NodeMailer)
 */
async function sendViaSMTP(
  from: string,
  options: SendEmailOptions,
  html: string
): Promise<SendEmailResult> {
  if (!transporter) {
    return { success: false, error: "SMTP transporter not initialized" }
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
      })),
    })

    return {
      success: true,
      data: { id: info.messageId },
    }
  } catch (error) {
    console.error("[email] SMTP error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email via SMTP",
    }
  }
}

/**
 * Send email via Resend (external service fallback)
 */
async function sendViaResend(from: string, options: SendEmailOptions): Promise<SendEmailResult> {
  // Dynamic import to avoid loading Resend if not needed
  const { Resend } = await import("resend")
  const resend = new Resend(resendApiKey)

  try {
    const result = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      react: options.react,
      attachments: options.attachments,
    })

    if (result.error) {
      console.error("[email] Resend error:", result.error)
      return {
        success: false,
        error: result.error.message || "Failed to send email via Resend",
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    console.error("[email] Resend error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email via Resend",
    }
  }
}

/**
 * Get the current email provider name (for diagnostics)
 */
export function getEmailProviderName(): string {
  const provider = getEmailProvider()
  if (provider === "smtp") return "SMTP (self-hosted)"
  if (provider === "resend") return "Resend (external)"
  return "None (emails disabled)"
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<{
  success: boolean
  provider: string
  error?: string
}> {
  const provider = getEmailProvider()
  const providerName = getEmailProviderName()

  if (provider === "none") {
    return {
      success: false,
      provider: providerName,
      error: "No email provider configured",
    }
  }

  if (provider === "smtp" && transporter) {
    try {
      await transporter.verify()
      return { success: true, provider: providerName }
    } catch (error) {
      return {
        success: false,
        provider: providerName,
        error: error instanceof Error ? error.message : "SMTP verification failed",
      }
    }
  }

  // For Resend, we just check if API key is set
  if (provider === "resend") {
    return { success: true, provider: providerName }
  }

  return { success: false, provider: providerName, error: "Unknown error" }
}

// Legacy export for backwards compatibility (deprecated)
export { transporter as resend }
