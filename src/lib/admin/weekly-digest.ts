import { db } from "@/lib/db"
import { getAdminMetrics, getOnboardingFunnel, getComplianceHealth } from "./metrics"
import { getActiveAlerts } from "./alerts"

// Re-export types and format function for backwards compatibility
export type {
  NewCustomer,
  MRRMetrics,
  SupportTicketStats,
  WeeklyDigestData,
  DigestAlert,
} from "./weekly-digest-types"
export { formatDigestEmail } from "./weekly-digest-format"

import type { NewCustomer, SupportTicketStats, WeeklyDigestData } from "./weekly-digest-types"

/**
 * Generate weekly digest data aggregating metrics from the past 7 days
 */
export async function generateWeeklyDigest(): Promise<WeeklyDigestData> {
  const weekEnd = new Date()
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)

  // Get overall metrics
  const [metrics, funnel, compliance, alerts] = await Promise.all([
    getAdminMetrics(),
    getOnboardingFunnel(),
    getComplianceHealth(),
    getActiveAlerts(),
  ])

  // Get new customers this week
  const newCustomersData = await db.company.findMany({
    where: {
      createdAt: { gte: weekStart },
    },
    include: {
      users: {
        where: { role: "OWNER" },
        include: { user: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const newCustomers: NewCustomer[] = newCustomersData.map((company) => ({
    id: company.id,
    name: company.name,
    email: company.users[0]?.user?.email || "No email",
    createdAt: company.createdAt,
    subscriptionStatus: company.subscriptionStatus || "none",
  }))

  // Calculate MRR metrics
  // For now, simplified - you can enhance with actual subscription pricing data
  const activeCompanies = await db.company.count({
    where: { subscriptionStatus: "active" },
  })

  const newActiveThisWeek = newCustomersData.filter((c) => c.subscriptionStatus === "active").length

  const churnedThisWeek = await db.company.count({
    where: {
      subscriptionStatus: "canceled",
      updatedAt: { gte: weekStart },
    },
  })

  // Assuming €30/month per active subscription (pausalni pricing)
  const baseMRR = 30
  const currentMRR = activeCompanies * baseMRR
  const newMRR = newActiveThisWeek * baseMRR
  const churnedMRR = churnedThisWeek * baseMRR

  // Count fiscalization attempts this week
  const fiscalizedThisWeek = await db.eInvoice.count({
    where: {
      fiscalizedAt: { gte: weekStart },
      jir: { not: null },
    },
  })

  // Support ticket stats (placeholder - adjust if you have a support ticket system)
  const supportStats: SupportTicketStats = {
    open: 0,
    closedThisWeek: 0,
    avgResponseTime: "N/A",
  }

  // Filter critical alerts for action items
  const criticalAlerts = alerts.filter((alert) => alert.level === "critical")

  return {
    weekStart,
    weekEnd,
    newCustomers: {
      count: newCustomers.length,
      list: newCustomers,
    },
    mrr: {
      currentMRR,
      newMRR,
      churnedMRR,
      upgrades: 0, // Placeholder
      downgrades: 0, // Placeholder
    },
    compliance: {
      certificatesActive: compliance.certificatesActive,
      certificatesExpiring: compliance.certificatesExpiring,
      fiscalizedThisWeek,
      successRate: compliance.successRate,
    },
    support: supportStats,
    actionItems: criticalAlerts,
    totalTenants: metrics.totalTenants,
    activeSubscriptions: metrics.activeSubscriptions,
    onboardingFunnel: {
      started: funnel.started,
      completed: funnel.completed,
      conversionRate:
        funnel.started > 0 ? Math.round((funnel.completed / funnel.started) * 100) : 0,
    },
  }
}
