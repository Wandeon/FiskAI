// Client-safe types for weekly digest

export interface NewCustomer {
  id: string
  name: string
  email: string
  createdAt: Date
  subscriptionStatus: string
}

export interface MRRMetrics {
  currentMRR: number
  newMRR: number
  churnedMRR: number
  upgrades: number
  downgrades: number
}

export interface SupportTicketStats {
  open: number
  closedThisWeek: number
  avgResponseTime: string
}

export interface DigestAlert {
  id: string
  level: string
  title: string
  companyName: string
  description: string
  autoAction?: string
}

export interface WeeklyDigestData {
  weekStart: Date
  weekEnd: Date
  newCustomers: {
    count: number
    list: NewCustomer[]
  }
  mrr: MRRMetrics
  compliance: {
    certificatesActive: number
    certificatesExpiring: number
    fiscalizedThisWeek: number
    successRate: number
  }
  support: SupportTicketStats
  actionItems: DigestAlert[]
  totalTenants: number
  activeSubscriptions: number
  onboardingFunnel: {
    started: number
    completed: number
    conversionRate: number
  }
}
