import { Html, Head, Body, Container, Section, Text, Link, Heading, Button } from "@react-email/components"
import React from "react"

interface PaymentFailedProps {
  companyName: string
  amount: number
  invoiceId: string
  retryDate: Date | null
  attemptNumber: number
}

export default function PaymentFailed({
  companyName,
  amount,
  invoiceId,
  retryDate,
  attemptNumber
}: PaymentFailedProps) {
  const formattedAmount = new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)

  const formattedRetryDate = retryDate
    ? new Intl.DateTimeFormat("hr-HR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(retryDate)
    : null

  return (
    <Html lang="hr">
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.headerTitle}>⚠️ Plaćanje nije uspjelo</Heading>
            <Text style={styles.headerSubtitle}>Potrebna je vaša akcija</Text>
          </Section>
          <Section style={styles.content}>
            <Text style={styles.greeting}>Poštovani,</Text>
            <Text style={styles.mainText}>
              Nažalost, nismo uspjeli naplatiti vašu FiskAI pretplatu za tvrtku <strong>{companyName}</strong>.
            </Text>

            <Section style={styles.alertCard}>
              <Text style={styles.alertLabel}>Detalji neuspjelog plaćanja:</Text>
              <Text style={styles.detailText}>
                <strong>Iznos:</strong> {formattedAmount}
              </Text>
              <Text style={styles.detailText}>
                <strong>Broj računa:</strong> {invoiceId}
              </Text>
              <Text style={styles.detailText}>
                <strong>Pokušaj:</strong> {attemptNumber}
              </Text>
              {formattedRetryDate && (
                <Text style={styles.detailText}>
                  <strong>Sljedeći pokušaj:</strong> {formattedRetryDate}
                </Text>
              )}
            </Section>

            <Text style={styles.mainText}>
              <strong>Što trebate učiniti:</strong>
            </Text>
            <ol style={styles.actionList}>
              <li style={styles.actionItem}>Provjerite da li vaša kartica ima dovoljno sredstava</li>
              <li style={styles.actionItem}>Uvjerite se da vaša kartica nije istekla</li>
              <li style={styles.actionItem}>Ažurirajte svoje podatke o plaćanju u postavkama</li>
            </ol>

            <Section style={styles.buttonContainer}>
              <Button href="https://app.fiskai.hr/settings/billing" style={styles.button}>
                Ažuriraj način plaćanja
              </Button>
            </Section>

            <Section style={styles.warningCard}>
              <Text style={styles.warningText}>
                <strong>Važno:</strong> Ako ne ažurirate podatke o plaćanju, vaša pretplata će biti automatski otkazana nakon nekoliko neuspjelih pokušaja. Ovo može rezultirati gubitkom pristupa vašim podacima i funkcijama platforme.
              </Text>
            </Section>

            <Text style={styles.footerText}>
              Ako imate bilo kakvih pitanja ili trebate pomoć, slobodno nas kontaktirajte.
            </Text>
          </Section>
          <Section style={styles.footer}>
            <Text style={styles.footerLink}>
              Trebate pomoć? <Link href="https://fiskai.hr/contact" style={styles.link}>Kontaktirajte nas</Link>
            </Text>
            <Text style={styles.copyright}>© 2025 FiskAI. Sva prava pridržana.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#f5f5f5",
    margin: 0,
    padding: "20px"
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  header: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "white",
    padding: "30px",
    textAlign: "center" as const
  },
  headerTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 600
  },
  headerSubtitle: {
    margin: "10px 0 0 0",
    opacity: 0.9,
    fontSize: "16px"
  },
  content: {
    padding: "30px"
  },
  greeting: {
    fontSize: "16px",
    color: "#333",
    marginBottom: "10px"
  },
  mainText: {
    fontSize: "15px",
    color: "#666",
    lineHeight: "1.6",
    marginBottom: "20px"
  },
  alertCard: {
    backgroundColor: "#fef2f2",
    padding: "20px",
    borderRadius: "6px",
    marginBottom: "20px",
    borderLeft: "4px solid #ef4444"
  },
  alertLabel: {
    fontSize: "13px",
    color: "#ef4444",
    margin: 0,
    fontWeight: 600,
    marginBottom: "12px"
  },
  detailText: {
    fontSize: "14px",
    color: "#333",
    margin: "6px 0",
    lineHeight: "1.5"
  },
  actionList: {
    paddingLeft: "20px",
    marginTop: "10px",
    marginBottom: "20px"
  },
  actionItem: {
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.8",
    marginBottom: "8px"
  },
  buttonContainer: {
    textAlign: "center" as const,
    margin: "30px 0"
  },
  button: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    padding: "14px 32px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "16px",
    display: "inline-block"
  },
  warningCard: {
    backgroundColor: "#fffbeb",
    padding: "16px",
    borderRadius: "6px",
    marginBottom: "20px",
    borderLeft: "4px solid #f59e0b"
  },
  warningText: {
    fontSize: "13px",
    color: "#92400e",
    margin: 0,
    lineHeight: "1.6"
  },
  footerText: {
    fontSize: "13px",
    color: "#999",
    textAlign: "center" as const,
    marginTop: "20px"
  },
  footer: {
    backgroundColor: "#f8f9fa",
    padding: "20px",
    textAlign: "center" as const
  },
  footerLink: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "10px"
  },
  link: {
    color: "#6366f1",
    textDecoration: "none"
  },
  copyright: {
    fontSize: "12px",
    color: "#999",
    marginTop: "10px"
  }
}
