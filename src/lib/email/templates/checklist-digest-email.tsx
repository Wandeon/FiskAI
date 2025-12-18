import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components"

interface ChecklistDigestItem {
  title: string
  description?: string
  dueDate?: string
  urgency: "critical" | "soon" | "upcoming" | "optional"
  href?: string
}

interface ChecklistDigestEmailProps {
  userName?: string
  companyName: string
  period: "daily" | "weekly"
  items: ChecklistDigestItem[]
  completedCount: number
  dashboardUrl: string
}

const urgencyColors = {
  critical: "#ef4444",
  soon: "#f59e0b",
  upcoming: "#3b82f6",
  optional: "#6b7280",
}

const urgencyLabels = {
  critical: "Hitno",
  soon: "Uskoro",
  upcoming: "Nadolazeće",
  optional: "Opcionalno",
}

export default function ChecklistDigestEmail({
  userName,
  companyName,
  period,
  items,
  completedCount,
  dashboardUrl,
}: ChecklistDigestEmailProps) {
  const periodLabel = period === "daily" ? "Dnevni" : "Tjedni"
  const previewText = `${periodLabel} pregled: ${items.length} zadataka za ${companyName}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{periodLabel} pregled zadataka</Heading>

          <Text style={paragraph}>{userName ? `Pozdrav ${userName},` : "Pozdrav,"}</Text>

          <Text style={paragraph}>
            Evo pregleda vaših obveza za <strong>{companyName}</strong>.
          </Text>

          {completedCount > 0 && (
            <Section style={successBox}>
              <Text style={successText}>
                ✓ Dovršili ste {completedCount} zadataka{" "}
                {period === "daily" ? "danas" : "ovaj tjedan"}!
              </Text>
            </Section>
          )}

          {items.length > 0 ? (
            <>
              <Heading as="h2" style={subheading}>
                Zadaci koji zahtijevaju pažnju ({items.length})
              </Heading>

              {items.map((item, index) => (
                <Section key={index} style={itemBox}>
                  <Text style={itemHeader}>
                    <span
                      style={{
                        ...urgencyBadge,
                        backgroundColor: urgencyColors[item.urgency],
                      }}
                    >
                      {urgencyLabels[item.urgency]}
                    </span>
                    {item.dueDate && <span style={dueDateText}> · {item.dueDate}</span>}
                  </Text>
                  <Text style={itemTitle}>{item.title}</Text>
                  {item.description && <Text style={itemDescription}>{item.description}</Text>}
                  {item.href && (
                    <Link href={item.href} style={itemLink}>
                      Otvori →
                    </Link>
                  )}
                </Section>
              ))}
            </>
          ) : (
            <Section style={emptyBox}>
              <Text style={emptyText}>🎉 Sve je pod kontrolom! Nemate hitnih zadataka.</Text>
            </Section>
          )}

          <Hr style={hr} />

          <Link href={dashboardUrl} style={ctaButton}>
            Otvori kontrolnu ploču
          </Link>

          <Text style={footer}>
            Ovaj email je automatski generiran iz FiskAI sustava.
            <br />
            Postavke obavijesti možete promijeniti u{" "}
            <Link href={`${dashboardUrl}/settings/guidance`} style={footerLink}>
              postavkama
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
}

const heading = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: "700" as const,
  textAlign: "center" as const,
  margin: "0 0 24px",
}

const subheading = {
  color: "#0f172a",
  fontSize: "18px",
  fontWeight: "600" as const,
  margin: "24px 0 16px",
}

const paragraph = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
}

const successBox = {
  backgroundColor: "#ecfdf5",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
}

const successText = {
  color: "#059669",
  fontSize: "14px",
  margin: "0",
}

const itemBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px",
  margin: "12px 0",
  borderLeft: "4px solid #e2e8f0",
}

const itemHeader = {
  margin: "0 0 8px",
  fontSize: "12px",
}

const urgencyBadge = {
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "600" as const,
  padding: "2px 8px",
  borderRadius: "4px",
  textTransform: "uppercase" as const,
}

const dueDateText = {
  color: "#64748b",
  fontSize: "12px",
}

const itemTitle = {
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
}

const itemDescription = {
  color: "#64748b",
  fontSize: "13px",
  margin: "0 0 8px",
}

const itemLink = {
  color: "#0ea5e9",
  fontSize: "13px",
  fontWeight: "500" as const,
}

const emptyBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
}

const emptyText = {
  color: "#166534",
  fontSize: "16px",
  margin: "0",
}

const hr = {
  borderColor: "#e2e8f0",
  margin: "32px 0",
}

const ctaButton = {
  backgroundColor: "#0ea5e9",
  borderRadius: "8px",
  color: "#ffffff",
  display: "block",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textAlign: "center" as const,
  textDecoration: "none",
  margin: "0 auto",
}

const footer = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "32px 0 0",
}

const footerLink = {
  color: "#0ea5e9",
}
