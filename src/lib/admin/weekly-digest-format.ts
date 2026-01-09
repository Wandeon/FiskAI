// Client-safe formatting function for weekly digest

import type { WeeklyDigestData } from "./weekly-digest-types"

/**
 * Format digest data into HTML email content
 */
export function formatDigestEmail(data: WeeklyDigestData): string {
  const weekStartStr = data.weekStart.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
  })
  const weekEndStr = data.weekEnd.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return `
<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FiskAI - Tjedni izvještaj</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600;">FiskAI Admin Digest</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Tjedni pregled platforme</p>
      <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">${weekStartStr} - ${weekEndStr}</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">

      <!-- Overview Stats -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 8px;">📊 Pregled</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Ukupno klijenata</div>
            <div style="font-size: 28px; font-weight: 600; color: #667eea; margin-top: 5px;">${data.totalTenants}</div>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
            <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Aktivne pretplate</div>
            <div style="font-size: 28px; font-weight: 600; color: #10b981; margin-top: 5px;">${data.activeSubscriptions}</div>
          </div>
        </div>
      </div>

      <!-- New Customers -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 8px;">🆕 Novi klijenti (${data.newCustomers.count})</h2>
        ${
          data.newCustomers.count === 0
            ? `<p style="color: #666; font-style: italic;">Nema novih klijenata ovaj tjedan.</p>`
            : `
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${data.newCustomers.list
            .slice(0, 10)
            .map(
              (customer) => `
            <li style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #333;">${customer.name}</strong>
                <div style="font-size: 13px; color: #666;">${customer.email}</div>
              </div>
              <div style="text-align: right;">
                <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;
                  ${
                    customer.subscriptionStatus === "active"
                      ? "background-color: #d1fae5; color: #065f46;"
                      : "background-color: #fee2e2; color: #991b1b;"
                  }">
                  ${customer.subscriptionStatus}
                </span>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">
                  ${customer.createdAt.toLocaleDateString("hr-HR")}
                </div>
              </div>
            </li>
          `
            )
            .join("")}
        </ul>
        ${
          data.newCustomers.count > 10
            ? `<p style="color: #666; font-size: 13px; margin-top: 10px; font-style: italic;">... i još ${data.newCustomers.count - 10}</p>`
            : ""
        }
        `
        }
      </div>

      <!-- MRR Metrics -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 8px;">💰 MRR metrike</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Trenutni MRR:</span>
            <strong style="color: #333; font-size: 18px;">€${data.mrr.currentMRR.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #10b981;">+ Novi MRR ovaj tjedan:</span>
            <strong style="color: #10b981;">€${data.mrr.newMRR}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #ef4444;">- Churn ovaj tjedan:</span>
            <strong style="color: #ef4444;">€${data.mrr.churnedMRR}</strong>
          </div>
        </div>
      </div>

      <!-- Compliance Health -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 8px;">✅ Compliance status</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 12px; color: #666;">Aktivni certifikati</div>
            <div style="font-size: 24px; font-weight: 600; color: #10b981; margin-top: 4px;">${data.compliance.certificatesActive}</div>
          </div>
          <div style="padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 12px; color: #666;">Certifikati ističu</div>
            <div style="font-size: 24px; font-weight: 600; color: ${data.compliance.certificatesExpiring > 0 ? "#f59e0b" : "#10b981"}; margin-top: 4px;">${data.compliance.certificatesExpiring}</div>
          </div>
          <div style="padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 12px; color: #666;">Fiskalizirano ovaj tjedan</div>
            <div style="font-size: 24px; font-weight: 600; color: #667eea; margin-top: 4px;">${data.compliance.fiscalizedThisWeek}</div>
          </div>
          <div style="padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 12px; color: #666;">Uspješnost fiskalizacije</div>
            <div style="font-size: 24px; font-weight: 600; color: ${data.compliance.successRate >= 95 ? "#10b981" : "#f59e0b"}; margin-top: 4px;">${data.compliance.successRate}%</div>
          </div>
        </div>
      </div>

      <!-- Onboarding Funnel -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 8px;">🚀 Onboarding lijevak</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Započeto:</span>
            <strong style="color: #333;">${data.onboardingFunnel.started}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Završeno:</span>
            <strong style="color: #333;">${data.onboardingFunnel.completed}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #666;">Conversion rate:</span>
            <strong style="color: ${data.onboardingFunnel.conversionRate >= 50 ? "#10b981" : "#f59e0b"};">${data.onboardingFunnel.conversionRate}%</strong>
          </div>
        </div>
      </div>

      <!-- Action Items -->
      ${
        data.actionItems.length > 0
          ? `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">🚨 Kritične akcije (${data.actionItems.length})</h2>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${data.actionItems
            .slice(0, 10)
            .map(
              (alert) => `
            <li style="padding: 12px; border-left: 4px solid #ef4444; background-color: #fef2f2; margin-bottom: 8px; border-radius: 4px;">
              <div style="font-weight: 600; color: #991b1b; margin-bottom: 4px;">${alert.title}</div>
              <div style="font-size: 13px; color: #666;">${alert.companyName}: ${alert.description}</div>
              ${alert.autoAction ? `<div style="font-size: 12px; color: #667eea; margin-top: 4px;">→ ${alert.autoAction}</div>` : ""}
            </li>
          `
            )
            .join("")}
        </ul>
        ${
          data.actionItems.length > 10
            ? `<p style="color: #666; font-size: 13px; margin-top: 10px; font-style: italic;">... i još ${data.actionItems.length - 10} kritičnih upozorenja</p>`
            : ""
        }
      </div>
      `
          : `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #10b981; padding-bottom: 8px;">✨ Kritične akcije</h2>
        <p style="color: #10b981; font-weight: 500;">Nema kritičnih upozorenja. Sve radi kako treba!</p>
      </div>
      `
      }

      <!-- CTA -->
      <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
        <a href="https://app.fiskai.hr/admin"
           style="display: inline-block; background-color: #667eea; color: white; padding: 14px 28px;
                  border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Otvori Admin Dashboard
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 13px;">
      <p style="margin: 0 0 5px 0;">FiskAI - Fiskalizacija pojednostavljena</p>
      <p style="margin: 0;">Ova poruka je automatski generirana tjednim cron poslom.</p>
    </div>

  </div>
</body>
</html>
  `.trim()
}
