import { db } from "@/lib/db"

/**
 * Certificate status information
 */
export interface CertificateStatus {
  loaded: boolean
  validUntil: Date | null
  daysRemaining: number | null
  status: "active" | "expiring" | "expired" | "none"
  issuer: string | null
}

/**
 * Fiscalization statistics
 */
export interface FiscalizationStats {
  total: number
  success: number
  failed: number
  successRate: number
  lastSync: Date | null
  todayCount: number
}

/**
 * Business premises information
 */
export interface PremisesInfo {
  id: string
  name: string
  address: string | null
  oznakaProstora: number
  registered: boolean
  devices: Array<{
    id: string
    name: string
    code: number
    isActive: boolean
  }>
}

/**
 * Complete compliance overview
 */
export interface ComplianceOverview {
  certificate: CertificateStatus
  fiscalization: FiscalizationStats
  premises: PremisesInfo[]
  recentInvoices: Array<{
    id: string
    invoiceNumber: string
    issueDate: Date
    totalAmount: number
    jir: string | null
    zki: string | null
    fiscalizedAt: Date | null
    status: string
  }>
}

/**
 * Get certificate status for a company
 */
export async function getCertificateStatus(companyId: string): Promise<CertificateStatus> {
  const certificate = await db.fiscalCertificate.findFirst({
    where: {
      companyId,
      environment: "PRODUCTION",
      status: "ACTIVE",
    },
    orderBy: {
      certNotAfter: "desc",
    },
  })

  if (!certificate) {
    return {
      loaded: false,
      validUntil: null,
      daysRemaining: null,
      status: "none",
      issuer: null,
    }
  }

  const now = new Date()
  const daysRemaining = Math.floor(
    (certificate.certNotAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  let status: "active" | "expiring" | "expired" | "none"
  if (daysRemaining < 0) {
    status = "expired"
  } else if (daysRemaining <= 30) {
    status = "expiring"
  } else {
    status = "active"
  }

  return {
    loaded: true,
    validUntil: certificate.certNotAfter,
    daysRemaining,
    status,
    issuer: certificate.certSubject,
  }
}

/**
 * Get fiscal premises for a company
 */
export async function getFiscalPremises(companyId: string): Promise<PremisesInfo[]> {
  const premises = await db.businessPremises.findMany({
    where: {
      companyId,
    },
    include: {
      devices: {
        orderBy: {
          code: "asc",
        },
      },
    },
    orderBy: {
      code: "asc",
    },
  })

  return premises.map((premise) => ({
    id: premise.id,
    name: premise.name,
    address: premise.address,
    oznakaProstora: premise.code,
    registered: premise.isActive,
    devices: premise.devices.map((device) => ({
      id: device.id,
      name: device.name,
      code: device.code,
      isActive: device.isActive,
    })),
  }))
}

/**
 * Get fiscalization statistics for a company
 */
export async function getFiscalizationStats(companyId: string): Promise<FiscalizationStats> {
  // Get all fiscal requests
  const allRequests = await db.fiscalRequest.findMany({
    where: {
      companyId,
    },
    select: {
      status: true,
      createdAt: true,
    },
  })

  const total = allRequests.length
  const success = allRequests.filter((r) => r.status === "SUCCESS").length
  const failed = allRequests.filter((r) => r.status === "FAILED").length
  const successRate = total > 0 ? (success / total) * 100 : 0

  // Get last sync time (most recent fiscal request)
  const lastRequest = await db.fiscalRequest.findFirst({
    where: {
      companyId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
  })

  // Get today's count
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todayRequests = await db.fiscalRequest.count({
    where: {
      companyId,
      createdAt: {
        gte: startOfDay,
      },
    },
  })

  return {
    total,
    success,
    failed,
    successRate,
    lastSync: lastRequest?.createdAt || null,
    todayCount: todayRequests,
  }
}

/**
 * Get recent fiscalized invoices for a company
 */
export async function getRecentFiscalizedInvoices(
  companyId: string,
  limit: number = 10
): Promise<
  Array<{
    id: string
    invoiceNumber: string
    issueDate: Date
    totalAmount: number
    jir: string | null
    zki: string | null
    fiscalizedAt: Date | null
    status: string
  }>
> {
  const invoices = await db.eInvoice.findMany({
    where: {
      companyId,
      jir: {
        not: null,
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
      issueDate: true,
      totalAmount: true,
      jir: true,
      zki: true,
      fiscalizedAt: true,
      status: true,
    },
    orderBy: {
      fiscalizedAt: "desc",
    },
    take: limit,
  })

  return invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    totalAmount: Number(invoice.totalAmount),
    jir: invoice.jir,
    zki: invoice.zki,
    fiscalizedAt: invoice.fiscalizedAt,
    status: invoice.status,
  }))
}

/**
 * Get complete compliance overview for a company
 */
export async function getComplianceOverview(companyId: string): Promise<ComplianceOverview> {
  const [certificate, fiscalization, premises, recentInvoices] = await Promise.all([
    getCertificateStatus(companyId),
    getFiscalizationStats(companyId),
    getFiscalPremises(companyId),
    getRecentFiscalizedInvoices(companyId),
  ])

  return {
    certificate,
    fiscalization,
    premises,
    recentInvoices,
  }
}
