import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Heading,
} from "@react-email/components"
import React from "react"
import type { WeeklyDigestData } from "@/lib/admin/weekly-digest"

interface AdminWeeklyDigestProps {
  data: WeeklyDigestData
}

export default function AdminWeeklyDigest({ data }: AdminWeeklyDigestProps) {
  const weekStartStr = data.weekStart.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
  })
  const weekEndStr = data.weekEnd.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <Html lang="hr">
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.headerTitle}>FiskAI Admin Digest</Heading>
            <Text style={styles.headerSubtitle}>Tjedni pregled platforme</Text>
            <Text style={styles.headerDate}>
              {weekStartStr} - {weekEndStr}
            </Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            {/* Overview Stats */}
            <Section style={styles.section}>
              <Heading style={styles.sectionTitle}>📊 Pregled</Heading>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <Text style={styles.statLabel}>Ukupno klijenata</Text>
                  <Text style={styles.statValue}>{data.totalTenants}</Text>
                </div>
                <div style={styles.statCard}>
                  <Text style={styles.statLabel}>Aktivne pretplate</Text>
                  <Text style={{ ...styles.statValue, color: "#10b981" }}>
                    {data.activeSubscriptions}
                  </Text>
                </div>
              </div>
            </Section>

            {/* New Customers */}
            <Section style={styles.section}>
              <Heading style={styles.sectionTitle}>
                🆕 Novi klijenti ({data.newCustomers.count})
              </Heading>
              {data.newCustomers.count === 0 ? (
                <Text style={styles.emptyState}>Nema novih klijenata ovaj tjedan.</Text>
              ) : (
                <>
                  {data.newCustomers.list.slice(0, 10).map((customer) => (
                    <div key={customer.id} style={styles.customerItem}>
                      <div>
                        <Text style={styles.customerName}>{customer.name}</Text>
                        <Text style={styles.customerEmail}>{customer.email}</Text>
                      </div>
                      <div style={styles.customerMeta}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor:
                              customer.subscriptionStatus === "active" ? "#d1fae5" : "#fee2e2",
                            color: customer.subscriptionStatus === "active" ? "#065f46" : "#991b1b",
                          }}
                        >
                          {customer.subscriptionStatus}
                        </span>
                        <Text style={styles.customerDate}>
                          {customer.createdAt.toLocaleDateString("hr-HR")}
                        </Text>
                      </div>
                    </div>
                  ))}
                  {data.newCustomers.count > 10 && (
                    <Text style={styles.moreItems}>... i još {data.newCustomers.count - 10}</Text>
                  )}
                </>
              )}
            </Section>

            {/* MRR Metrics */}
            <Section style={styles.section}>
              <Heading style={styles.sectionTitle}>💰 MRR metrike</Heading>
              <div style={styles.mrrCard}>
                <div style={styles.mrrRow}>
                  <Text style={styles.mrrLabel}>Trenutni MRR:</Text>
                  <Text style={styles.mrrValue}>€{data.mrr.currentMRR.toLocaleString()}</Text>
                </div>
                <div style={styles.mrrRow}>
                  <Text style={{ ...styles.mrrLabel, color: "#10b981" }}>
                    + Novi MRR ovaj tjedan:
                  </Text>
                  <Text style={{ ...styles.mrrValue, color: "#10b981" }}>€{data.mrr.newMRR}</Text>
                </div>
                <div style={styles.mrrRow}>
                  <Text style={{ ...styles.mrrLabel, color: "#ef4444" }}>- Churn ovaj tjedan:</Text>
                  <Text style={{ ...styles.mrrValue, color: "#ef4444" }}>
                    €{data.mrr.churnedMRR}
                  </Text>
                </div>
              </div>
            </Section>

            {/* Compliance Health */}
            <Section style={styles.section}>
              <Heading style={styles.sectionTitle}>✅ Compliance status</Heading>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <Text style={styles.statLabel}>Aktivni certifikati</Text>
                  <Text style={{ ...styles.statValue, color: "#10b981" }}>
                    {data.compliance.certificatesActive}
                  </Text>
                </div>
                <div style={styles.statCard}>
                  <Text style={styles.statLabel}>Certifikati ističu</Text>
                  <Text
                    style={{
                      ...styles.statValue,
                      color: data.compliance.certificatesExpiring > 0 ? "#f59e0b" : "#10b981",
                    }}
                  >
                    {data.compliance.certificatesExpiring}
                  </Text>
                </div>
                <div style={styles.statCard}>
                  <Text style={styles.statLabel}>Fiskalizirano ovaj tjedan</Text>
                  <Text style={{ ...styles.statValue, color: "#667eea" }}>
                    {data.compliance.fiscalizedThisWeek}
                  </Text>
                </div>
                <div style={styles.statCard}>
                  <Text style={styles.statLabel}>Uspješnost fiskalizacije</Text>
                  <Text
                    style={{
                      ...styles.statValue,
                      color: data.compliance.successRate >= 95 ? "#10b981" : "#f59e0b",
                    }}
                  >
                    {data.compliance.successRate}%
                  </Text>
                </div>
              </div>
            </Section>

            {/* Onboarding Funnel */}
            <Section style={styles.section}>
              <Heading style={styles.sectionTitle}>🚀 Onboarding lijevak</Heading>
              <div style={styles.mrrCard}>
                <div style={styles.mrrRow}>
                  <Text style={styles.mrrLabel}>Započeto:</Text>
                  <Text style={styles.mrrValue}>{data.onboardingFunnel.started}</Text>
                </div>
                <div style={styles.mrrRow}>
                  <Text style={styles.mrrLabel}>Završeno:</Text>
                  <Text style={styles.mrrValue}>{data.onboardingFunnel.completed}</Text>
                </div>
                <div style={styles.mrrRow}>
                  <Text style={styles.mrrLabel}>Conversion rate:</Text>
                  <Text
                    style={{
                      ...styles.mrrValue,
                      color: data.onboardingFunnel.conversionRate >= 50 ? "#10b981" : "#f59e0b",
                    }}
                  >
                    {data.onboardingFunnel.conversionRate}%
                  </Text>
                </div>
              </div>
            </Section>

            {/* Action Items */}
            {data.actionItems.length > 0 ? (
              <Section style={styles.section}>
                <Heading style={{ ...styles.sectionTitle, borderBottomColor: "#ef4444" }}>
                  🚨 Kritične akcije ({data.actionItems.length})
                </Heading>
                {data.actionItems.slice(0, 10).map((alert) => (
                  <div key={alert.id} style={styles.alertItem}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertDescription}>
                      {alert.companyName}: {alert.description}
                    </Text>
                    {alert.autoAction && (
                      <Text style={styles.alertAction}>→ {alert.autoAction}</Text>
                    )}
                  </div>
                ))}
                {data.actionItems.length > 10 && (
                  <Text style={styles.moreItems}>
                    ... i još {data.actionItems.length - 10} kritičnih upozorenja
                  </Text>
                )}
              </Section>
            ) : (
              <Section style={styles.section}>
                <Heading style={{ ...styles.sectionTitle, borderBottomColor: "#10b981" }}>
                  ✨ Kritične akcije
                </Heading>
                <Text style={{ ...styles.emptyState, color: "#10b981", fontWeight: 500 }}>
                  Nema kritičnih upozorenja. Sve radi kako treba!
                </Text>
              </Section>
            )}

            {/* CTA */}
            <Section style={styles.ctaSection}>
              <Link href="https://admin.fiskai.hr/dashboard" style={styles.ctaButton}>
                Otvori Admin Dashboard
              </Link>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>FiskAI - Fiskalizacija pojednostavljena</Text>
            <Text style={styles.footerText}>
              Ova poruka je automatski generirana tjednim cron poslom.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const styles = {
  body: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    backgroundColor: "#f5f5f5",
    margin: 0,
    padding: "20px",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "30px",
    textAlign: "center" as const,
  },
  headerTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 600,
  },
  headerSubtitle: {
    margin: "10px 0 0 0",
    opacity: 0.9,
    fontSize: "16px",
  },
  headerDate: {
    margin: "5px 0 0 0",
    opacity: 0.8,
    fontSize: "14px",
  },
  content: {
    padding: "30px",
  },
  section: {
    marginBottom: "30px",
  },
  sectionTitle: {
    color: "#333",
    fontSize: "20px",
    margin: "0 0 15px 0",
    borderBottom: "2px solid #667eea",
    paddingBottom: "8px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
  },
  statCard: {
    backgroundColor: "#f8f9fa",
    padding: "15px",
    borderRadius: "6px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    margin: 0,
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 600,
    color: "#667eea",
    marginTop: "5px",
  },
  emptyState: {
    color: "#666",
    fontStyle: "italic" as const,
    margin: 0,
  },
  customerItem: {
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerName: {
    fontWeight: 600,
    color: "#333",
    margin: 0,
  },
  customerEmail: {
    fontSize: "13px",
    color: "#666",
    margin: 0,
  },
  customerMeta: {
    textAlign: "right" as const,
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 500,
  },
  customerDate: {
    fontSize: "12px",
    color: "#999",
    marginTop: "4px",
  },
  moreItems: {
    color: "#666",
    fontSize: "13px",
    marginTop: "10px",
    fontStyle: "italic" as const,
  },
  mrrCard: {
    backgroundColor: "#f8f9fa",
    padding: "15px",
    borderRadius: "6px",
  },
  mrrRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  mrrLabel: {
    color: "#666",
    margin: 0,
  },
  mrrValue: {
    fontWeight: 600,
    color: "#333",
    fontSize: "18px",
    margin: 0,
  },
  alertItem: {
    padding: "12px",
    borderLeft: "4px solid #ef4444",
    backgroundColor: "#fef2f2",
    marginBottom: "8px",
    borderRadius: "4px",
  },
  alertTitle: {
    fontWeight: 600,
    color: "#991b1b",
    marginBottom: "4px",
  },
  alertDescription: {
    fontSize: "13px",
    color: "#666",
    margin: 0,
  },
  alertAction: {
    fontSize: "12px",
    color: "#667eea",
    marginTop: "4px",
  },
  ctaSection: {
    textAlign: "center" as const,
    marginTop: "30px",
    paddingTop: "30px",
    borderTop: "1px solid #e5e7eb",
  },
  ctaButton: {
    display: "inline-block",
    backgroundColor: "#667eea",
    color: "white",
    padding: "14px 28px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "16px",
  },
  footer: {
    backgroundColor: "#f8f9fa",
    padding: "20px",
    textAlign: "center" as const,
  },
  footerText: {
    color: "#666",
    fontSize: "13px",
    margin: "0 0 5px 0",
  },
}
