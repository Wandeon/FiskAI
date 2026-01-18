import { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { PausalniDashboard } from "@/components/pausalni/pausalni-dashboard"
import { complianceService } from "@/lib/services/compliance.service"
import { regulatoryCalendarService } from "@/lib/services/regulatory-calendar.service"
import { db } from "@/lib/db"
import type { Deadline } from "@/components/patterns/dashboard"

export const metadata: Metadata = {
  title: "Paušalni Compliance Hub | FiskAI",
  description: "Upravljajte svim obvezama vašeg paušalnog obrta na jednom mjestu",
}

export default async function PausalniDashboardPage() {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  if (company.legalForm !== "OBRT_PAUSAL") {
    redirect("/")
  }

  // Fetch compliance status
  const complianceStatus = await complianceService.evaluateCompliance(company.id)

  // Fetch YTD revenue from invoices (in cents)
  const year = new Date().getFullYear()
  const ytdRevenueResult = await db.eInvoice.aggregate({
    where: {
      companyId: company.id,
      status: { in: ["FISCALIZED", "SENT", "DELIVERED", "ACCEPTED"] },
      createdAt: {
        gte: new Date(year, 0, 1), // Jan 1 of current year
      },
    },
    _sum: { totalAmount: true },
  })
  // Convert from Decimal euros to cents
  const ytdRevenueCents = Math.round(Number(ytdRevenueResult._sum.totalAmount || 0) * 100)

  // Get pausal limit from regulatory calendar (convert to cents)
  const pausalLimit = regulatoryCalendarService.getPausalLimit(year)
  const pausalLimitCents = pausalLimit * 100

  // Get upcoming deadlines
  const upcomingDeadlinesRaw = regulatoryCalendarService.getUpcomingDeadlines(90)
  const deadlines: Deadline[] = upcomingDeadlinesRaw.slice(0, 5).map((d, index) => {
    // Infer type from name for color coding
    const lowerName = d.name.toLowerCase()
    let type: "tax" | "contribution" | "vat" | "other" = "other"
    if (lowerName.includes("porez") || lowerName.includes("dohodak")) {
      type = "tax"
    } else if (
      lowerName.includes("doprinos") ||
      lowerName.includes("mio") ||
      lowerName.includes("zo")
    ) {
      type = "contribution"
    } else if (lowerName.includes("pdv")) {
      type = "vat"
    }

    return {
      id: `deadline-${index}`,
      name: d.name,
      date: d.date,
      type,
    }
  })

  // Get last invoice date for "last updated"
  const lastInvoice = await db.eInvoice.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  return (
    <PausalniDashboard
      companyId={company.id}
      companyName={company.name}
      complianceStatus={complianceStatus}
      ytdRevenueCents={ytdRevenueCents}
      pausalLimitCents={pausalLimitCents}
      year={year}
      lastUpdated={lastInvoice?.createdAt || new Date()}
      deadlines={deadlines}
    />
  )
}
