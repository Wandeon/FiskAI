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
  Row,
  Column,
} from "@react-email/components"

interface OTPCodeEmailProps {
  code: string
  userName?: string
  type: "verify" | "login" | "reset"
}

export function OTPCodeEmail({ code, userName, type = "verify" }: OTPCodeEmailProps) {
  const digits = code.split("")

  const titles = {
    verify: "Potvrdite svoju email adresu",
    login: "Vaš kod za prijavu",
    reset: "Kod za resetiranje lozinke",
  }

  const descriptions = {
    verify: "Unesite ovaj kod u aplikaciju kako biste dovršili registraciju.",
    login: "Unesite ovaj kod za prijavu na vaš FiskAI račun.",
    reset: "Unesite ovaj kod za resetiranje vaše lozinke.",
  }

  return (
    <Html>
      <Head>
        <style>
          {`
            @media only screen and (max-width: 600px) {
              .digit-box {
                width: 40px !important;
                height: 48px !important;
                font-size: 24px !important;
              }
            }
          `}
        </style>
      </Head>
      <Preview>Vaš FiskAI kod: {code}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand header */}
          <Section style={logoSection}>
            <Text style={logoText}>FiskAI</Text>
          </Section>

          <Heading style={h1}>{titles[type]}</Heading>

          <Text style={greeting}>
            {userName ? `Pozdrav ${userName},` : "Pozdrav,"}
          </Text>

          <Text style={description}>{descriptions[type]}</Text>

          {/* Premium OTP Code Display */}
          <Section style={codeSection}>
            <Row style={codeRow}>
              {digits.map((digit, i) => (
                <Column key={i} style={digitColumn}>
                  <Text style={digitBox} className="digit-box">{digit}</Text>
                </Column>
              ))}
            </Row>
          </Section>

          <Text style={expiryText}>
            Ovaj kod vrijedi <strong>10 minuta</strong>
          </Text>

          {/* Security notice */}
          <Section style={securityBox}>
            <Text style={securityText}>
              Ako niste zatražili ovaj kod, možete ga zanemariti.
              <br />
              Nikada ne dijelite ovaj kod s drugima.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            S poštovanjem,
            <br />
            <strong>FiskAI Tim</strong>
          </Text>

          <Text style={footerSmall}>
            Ovo je automatizirana poruka. Molimo ne odgovarajte na ovaj email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: "#f0f4f8",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
  padding: "40px 0",
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  maxWidth: "480px",
  borderRadius: "16px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  overflow: "hidden",
}

const logoSection = {
  backgroundColor: "#0891b2",
  padding: "24px 40px",
  textAlign: "center" as const,
}

const logoText = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
  letterSpacing: "-0.5px",
}

const h1 = {
  color: "#1f2937",
  fontSize: "22px",
  fontWeight: "600",
  margin: "32px 40px 0",
  textAlign: "center" as const,
}

const greeting = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "24px 40px 8px",
}

const description = {
  color: "#6b7280",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 40px 24px",
}

const codeSection = {
  padding: "24px 40px",
  backgroundColor: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
}

const codeRow = {
  width: "100%",
}

const digitColumn = {
  width: "16.666%",
  textAlign: "center" as const,
  padding: "0 4px",
}

const digitBox = {
  display: "inline-block",
  width: "48px",
  height: "56px",
  lineHeight: "56px",
  fontSize: "28px",
  fontWeight: "700",
  fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
  color: "#0891b2",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "2px solid #e5e7eb",
  margin: "0",
  letterSpacing: "0",
}

const expiryText = {
  color: "#6b7280",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "24px 40px 0",
}

const securityBox = {
  margin: "24px 40px",
  padding: "16px",
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  border: "1px solid #fbbf24",
}

const securityText = {
  color: "#92400e",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
  textAlign: "center" as const,
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "0 40px",
}

const footer = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "24px 40px 12px",
  textAlign: "center" as const,
}

const footerSmall = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 40px 32px",
  textAlign: "center" as const,
}

export default OTPCodeEmail
