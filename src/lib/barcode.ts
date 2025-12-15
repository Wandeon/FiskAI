import QRCode from "qrcode"

// IBAN validation using ISO 13616 mod-97 algorithm
export function validateIban(iban: string): { valid: boolean; error?: string } {
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s+/g, "").toUpperCase()

  // Basic format check: 2 letters + 2 digits + up to 30 alphanumeric
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(cleanIban)) {
    return { valid: false, error: "Invalid IBAN format" }
  }

  // Country-specific length check (common countries)
  const countryLengths: Record<string, number> = {
    HR: 21, // Croatia
    DE: 22, // Germany
    AT: 20, // Austria
    SI: 19, // Slovenia
    IT: 27, // Italy
    FR: 27, // France
    ES: 24, // Spain
    NL: 18, // Netherlands
    BE: 16, // Belgium
    CH: 21, // Switzerland
  }

  const country = cleanIban.slice(0, 2)
  const expectedLength = countryLengths[country]
  if (expectedLength && cleanIban.length !== expectedLength) {
    return {
      valid: false,
      error: `Invalid IBAN length for ${country}: expected ${expectedLength}, got ${cleanIban.length}`,
    }
  }

  // ISO 13616 mod-97 validation
  // Move first 4 chars to end
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4)

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numericString = ""
  for (const char of rearranged) {
    if (char >= "A" && char <= "Z") {
      numericString += (char.charCodeAt(0) - 55).toString()
    } else {
      numericString += char
    }
  }

  // Calculate mod 97 using chunks (to avoid BigInt issues)
  let remainder = 0
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = numericString.slice(i, i + 7)
    remainder = parseInt(remainder.toString() + chunk, 10) % 97
  }

  if (remainder !== 1) {
    return { valid: false, error: "Invalid IBAN checksum" }
  }

  return { valid: true }
}

type BarcodeParams = {
  creditorName: string
  creditorIban: string
  amount: number
  currency?: string
  invoiceNumber?: string
  dueDate?: Date | null
  reference?: string
}

// Format amount with 2 decimals and dot separator
const formatAmount = (amount: number, currency: string) => {
  const safe = Number.isFinite(amount) ? amount : 0
  return `${currency}${safe.toFixed(2)}`
}

// EPC QR (SEPA credit transfer) payload; many HR banks accept it.
function buildEpcQrPayload(params: BarcodeParams) {
  const {
    creditorName,
    creditorIban,
    amount,
    currency = "EUR",
    invoiceNumber,
    dueDate,
    reference,
  } = params

  // EPC spec: https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2018-05/EPC069-12%20v2.7%20Payment%20Initiation%20Messages%20Implementation%20Guidelines%20.pdf
  const lines = [
    "BCD", // Identifier
    "001", // Version
    "1", // Character set: UTF-8
    "SCT", // SEPA Credit Transfer
    "", // BIC optional
    creditorName.slice(0, 70),
    creditorIban.replace(/\s+/g, ""),
    formatAmount(amount, currency),
    "", // Purpose code optional
    reference || invoiceNumber || "",
    [
      invoiceNumber ? `Račun: ${invoiceNumber}` : null,
      dueDate ? `Dospijeće: ${dueDate.toISOString().slice(0, 10)}` : null,
    ]
      .filter(Boolean)
      .join(" "),
  ]

  return lines.join("\n")
}

export async function generateInvoiceBarcodeDataUrl(params: BarcodeParams) {
  // Validate IBAN before generating QR code
  const ibanValidation = validateIban(params.creditorIban)
  if (!ibanValidation.valid) {
    throw new Error(`Invalid IBAN: ${ibanValidation.error}`)
  }

  const payload = buildEpcQrPayload(params)
  // Use medium error correction, small margin
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, scale: 6 })
}
