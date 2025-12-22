// src/lib/regulatory-truth/watchdog/email.ts

import * as nodemailer from "nodemailer"
import type { WatchdogAlert } from "@prisma/client"

const SMTP_HOST = process.env.SMTP_HOST || "localhost"
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587")
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || "noreply@fiskai.hr"
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  }
  return transporter
}

/**
 * Send critical alert email immediately
 */
export async function sendCriticalEmail(alert: WatchdogAlert): Promise<boolean> {
  if (!ADMIN_EMAIL) {
    console.log("[email] No admin email configured, skipping notification")
    return false
  }

  const subject = `[FiskAI CRITICAL] ${alert.type}: ${alert.message}`
  const html = `
    <h2>Regulatory Truth Pipeline Alert</h2>
    <table>
      <tr><td><strong>Severity:</strong></td><td style="color: red;">CRITICAL</td></tr>
      <tr><td><strong>Type:</strong></td><td>${alert.type}</td></tr>
      <tr><td><strong>Entity:</strong></td><td>${alert.entityId || "N/A"}</td></tr>
      <tr><td><strong>Time:</strong></td><td>${alert.occurredAt.toISOString()}</td></tr>
    </table>
    <h3>Message</h3>
    <p>${alert.message}</p>
    ${alert.details ? `<h3>Details</h3><pre>${JSON.stringify(alert.details, null, 2)}</pre>` : ""}
    <hr>
    <p><a href="https://fiskai.hr/admin/watchdog">View Dashboard</a></p>
  `

  try {
    await getTransporter().sendMail({
      from: SMTP_FROM,
      to: ADMIN_EMAIL,
      subject,
      html,
    })
    console.log(`[email] Critical alert sent to ${ADMIN_EMAIL}`)
    return true
  } catch (error) {
    console.error("[email] Failed to send critical alert:", error)
    return false
  }
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(
  warnings: WatchdogAlert[],
  stats: {
    sourcesChecked: number
    itemsDiscovered: number
    rulesCreated: number
    avgConfidence: number
  }
): Promise<boolean> {
  if (!ADMIN_EMAIL) {
    console.log("[email] No admin email configured, skipping digest")
    return false
  }

  const date = new Date().toISOString().split("T")[0]
  const status = warnings.length === 0 ? "HEALTHY" : "WARNINGS"
  const subject = `[FiskAI] Daily Watchdog Report - ${date}`

  const warningsList =
    warnings.length > 0
      ? warnings.map((w) => `<li>${w.type}: ${w.message}</li>`).join("\n")
      : "<li>No warnings</li>"

  const html = `
    <h2>Daily Watchdog Report</h2>
    <p><strong>Status:</strong> ${status}</p>

    <h3>Warnings (last 24h)</h3>
    <ul>${warningsList}</ul>

    <h3>Health Summary</h3>
    <ul>
      <li>Sources checked: ${stats.sourcesChecked}</li>
      <li>Items discovered: ${stats.itemsDiscovered}</li>
      <li>Rules created: ${stats.rulesCreated}</li>
      <li>Avg confidence: ${(stats.avgConfidence * 100).toFixed(1)}%</li>
    </ul>

    <hr>
    <p><a href="https://fiskai.hr/admin/watchdog">View Dashboard</a></p>
  `

  try {
    await getTransporter().sendMail({
      from: SMTP_FROM,
      to: ADMIN_EMAIL,
      subject,
      html,
    })
    console.log(`[email] Daily digest sent to ${ADMIN_EMAIL}`)
    return true
  } catch (error) {
    console.error("[email] Failed to send daily digest:", error)
    return false
  }
}
