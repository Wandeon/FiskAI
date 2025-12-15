import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components"

interface InvoiceEmailProps {
  invoiceNumber: string
  buyerName: string
  issueDate: string
  dueDate?: string
  totalAmount: string
  currency: string
  companyName: string
  jir?: string
  isB2B?: boolean
}

export function InvoiceEmail({
  invoiceNumber,
  buyerName,
  issueDate,
  dueDate,
  totalAmount,
  currency,
  companyName,
  jir,
  isB2B = false,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Račun {invoiceNumber} - {companyName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Račun {invoiceNumber}</Heading>

          <Text style={text}>Poštovani {buyerName},</Text>

          <Text style={text}>
            U prilogu vam šaljemo račun broj <strong>{invoiceNumber}</strong>.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>Detalji računa</Text>
            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={infoLabel}>Broj računa:</td>
                  <td style={infoValue}>{invoiceNumber}</td>
                </tr>
                <tr>
                  <td style={infoLabel}>Datum izdavanja:</td>
                  <td style={infoValue}>{issueDate}</td>
                </tr>
                {dueDate && (
                  <tr>
                    <td style={infoLabel}>Rok plaćanja:</td>
                    <td style={infoValue}>{dueDate}</td>
                  </tr>
                )}
                <tr>
                  <td style={infoLabel}>Ukupan iznos:</td>
                  <td style={infoValue}>
                    <strong>
                      {totalAmount} {currency}
                    </strong>
                  </td>
                </tr>
                {jir && (
                  <tr>
                    <td style={infoLabel}>JIR:</td>
                    <td style={infoValueMono}>{jir}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          {isB2B && (
            <Section style={warningBox}>
              <Text style={warningText}>
                <strong>Napomena za poslovne klijente (D.O.O.):</strong>
                <br />
                Originalni e-Račun poslan je putem FINA sustava. Ovo je kopija za evidenciju.
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={text}>Račun u PDF formatu nalazi se u prilogu ovog e-maila.</Text>

          <Text style={text}>Molimo izvršite plaćanje prema uputama navedenim na računu.</Text>

          <Hr style={hr} />

          <Text style={footer}>
            S poštovanjem,
            <br />
            <strong>{companyName}</strong>
          </Text>

          <Text style={footerSmall}>
            Ovo je automatizirano obavijest. Molimo ne odgovarajte na ovaj e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Ubuntu,sans-serif",
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
}

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 40px",
}

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 40px",
}

const infoBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "20px",
}

const infoTitle = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
}

const infoTable = {
  width: "100%",
}

const infoLabel = {
  color: "#6b7280",
  fontSize: "14px",
  paddingBottom: "8px",
  paddingRight: "16px",
  verticalAlign: "top",
}

const infoValue = {
  color: "#1f2937",
  fontSize: "14px",
  paddingBottom: "8px",
  verticalAlign: "top",
}

const infoValueMono = {
  color: "#1f2937",
  fontSize: "12px",
  paddingBottom: "8px",
  verticalAlign: "top",
  fontFamily: "monospace",
}

const warningBox = {
  backgroundColor: "#fef3c7",
  border: "1px solid #fbbf24",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "16px",
}

const warningText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 40px",
}

const footer = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "24px 40px 16px",
}

const footerSmall = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "8px 40px",
}

export default InvoiceEmail
