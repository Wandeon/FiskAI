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
  Button,
  Link,
} from '@react-email/components'

interface WelcomeEmailProps {
  userName: string
  loginUrl: string
}

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Dobrodošli u FiskAI - Vaš novi asistent za fakturiranje</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Dobrodošli u FiskAI!</Heading>

          <Text style={text}>
            Poštovani {userName},
          </Text>

          <Text style={text}>
            Hvala vam što ste se registrirali na FiskAI - vašeg novog asistenta za
            fakturiranje i vođenje poslovanja.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightText}>
              <strong>Što možete napraviti s FiskAI:</strong>
              <br />
              <br />
              • Kreirajte i šaljite e-račune u par klikova
              <br />
              • Automatizirajte fiskalizaciju (JIR/ZKI)
              <br />
              • Skenirajte račune i automatski evidentirajte troškove
              <br />
              • Povežite bankovne račune za automatsko usklađivanje
              <br />
              • Generirajte izvještaje za KPR i PDV
            </Text>
          </Section>

          <Text style={text}>
            <strong>Sljedeći koraci:</strong>
          </Text>

          <Text style={stepText}>
            1. <strong>Prijavite se</strong> na svoj račun
          </Text>
          <Text style={stepText}>
            2. <strong>Unesite podatke tvrtke</strong> (OIB, adresa, kontakt)
          </Text>
          <Text style={stepText}>
            3. <strong>Kreirajte prvi račun</strong> i pošaljite ga kupcu
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={loginUrl}>
              Prijavi se i započni
            </Button>
          </Section>

          <Section style={trialBox}>
            <Text style={trialText}>
              <strong>Vaše probno razdoblje</strong>
              <br />
              Imate 14 dana besplatnog korištenja svih funkcionalnosti.
              Ne trebate karticu - isprobajte sve bez obveza!
            </Text>
          </Section>

          <Text style={text}>
            Ako imate pitanja ili trebate pomoć, slobodno nas kontaktirajte na{' '}
            <Link href="mailto:podrska@fiskai.app" style={link}>
              podrska@fiskai.app
            </Link>
            .
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Srdačan pozdrav,
            <br />
            <strong>FiskAI Tim</strong>
          </Text>

          <Text style={footerSmall}>
            Primili ste ovaj e-mail jer ste se registrirali na FiskAI.
            Ako niste vi kreirali račun, možete zanemariti ovaj e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 40px',
}

const stepText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 40px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 40px',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const highlightBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
}

const highlightText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const trialBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
}

const trialText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 40px',
}

const footer = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 40px 16px',
}

const footerSmall = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '8px 40px',
}

export default WelcomeEmail
