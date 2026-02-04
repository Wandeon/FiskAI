import { EInvoiceWithRelations } from "./types"
import { Company, Contact, EInvoiceLine, Prisma } from "@prisma/client"

const UBL_NAMESPACES = {
  invoice: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
}

const CUSTOMIZATION_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.hr:cius-2025:1.0#conformant#urn:mfin.gov.hr:ext-2025:1.0"
const PROFILE_ID = "P1"

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function formatTime(date: Date): string {
  return date.toTimeString().split(" ")[0]
}

function formatDecimal(value: number | string | Prisma.Decimal, decimals: number = 2): string {
  return Number(value).toFixed(decimals)
}

function generatePartyXml(party: Contact | Company, isSupplier: boolean): string {
  const oib = "oib" in party ? party.oib : null
  const vatNumber = "vatNumber" in party ? party.vatNumber : null

  const sellerContact = isSupplier && oib ? `
    <cac:SellerContact>
      <cbc:ID>${escapeXml(oib)}</cbc:ID>
      <cbc:Name>Operator-1</cbc:Name>
    </cac:SellerContact>` : ""

  return `
    <cac:${isSupplier ? "AccountingSupplierParty" : "AccountingCustomerParty"}>
      <cac:Party>
        ${oib ? `<cbc:EndpointID schemeID="9934">${escapeXml(oib)}</cbc:EndpointID>` : ""}
        <cac:PartyIdentification>
          <cbc:ID>${oib ? `9934:${escapeXml(oib)}` : ""}</cbc:ID>
        </cac:PartyIdentification>
        <cac:PartyName>
          <cbc:Name>${escapeXml(party.name)}</cbc:Name>
        </cac:PartyName>
        <cac:PostalAddress>
          <cbc:StreetName>${escapeXml(party.address || "")}</cbc:StreetName>
          <cbc:CityName>${escapeXml(party.city || "")}</cbc:CityName>
          <cbc:PostalZone>${escapeXml(party.postalCode || "")}</cbc:PostalZone>
          <cac:Country>
            <cbc:IdentificationCode>${escapeXml(party.country || "HR")}</cbc:IdentificationCode>
          </cac:Country>
        </cac:PostalAddress>
        ${
          vatNumber
            ? `
        <cac:PartyTaxScheme>
          <cbc:CompanyID>${escapeXml(vatNumber)}</cbc:CompanyID>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:PartyTaxScheme>`
            : ""
        }
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${escapeXml(party.name)}</cbc:RegistrationName>
          ${oib ? `<cbc:CompanyID>${escapeXml(oib)}</cbc:CompanyID>` : ""}
        </cac:PartyLegalEntity>
      </cac:Party>${sellerContact}
    </cac:${isSupplier ? "AccountingSupplierParty" : "AccountingCustomerParty"}>`
}

function generateInvoiceLineXml(line: EInvoiceLine): string {
  return `
    <cac:InvoiceLine>
      <cbc:ID>${line.lineNumber}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${escapeXml(line.unit)}">${formatDecimal(line.quantity, 3)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="EUR">${formatDecimal(line.netAmount)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${escapeXml(line.description)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${escapeXml(line.vatCategory)}</cbc:ID>
          <cbc:Percent>${formatDecimal(line.vatRate)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="EUR">${formatDecimal(line.unitPrice)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`
}

export function generateUBLInvoice(invoice: EInvoiceWithRelations): string {
  if (!invoice.buyer) {
    throw new Error("Invoice must have a buyer")
  }

  const { company, buyer, lines } = invoice

  // Group lines by VAT rate for tax subtotals
  const taxSubtotals = lines.reduce(
    (acc, line) => {
      const key = `${line.vatCategory}-${line.vatRate}`
      if (!acc[key]) {
        acc[key] = {
          category: line.vatCategory,
          rate: Number(line.vatRate),
          taxableAmount: 0,
          taxAmount: 0,
        }
      }
      acc[key].taxableAmount += Number(line.netAmount)
      acc[key].taxAmount += Number(line.vatAmount)
      return acc
    },
    {} as Record<
      string,
      {
        category: string
        rate: number
        taxableAmount: number
        taxAmount: number
      }
    >
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="${UBL_NAMESPACES.invoice}"
         xmlns:cac="${UBL_NAMESPACES.cac}"
         xmlns:cbc="${UBL_NAMESPACES.cbc}">
  <cbc:CustomizationID>${CUSTOMIZATION_ID}</cbc:CustomizationID>
  <cbc:ProfileID>${PROFILE_ID}</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${formatDate(invoice.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${formatTime(invoice.issueDate)}</cbc:IssueTime>
  ${invoice.dueDate ? `<cbc:DueDate>${formatDate(invoice.dueDate)}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escapeXml(invoice.currency)}</cbc:DocumentCurrencyCode>
  ${invoice.buyerReference ? `<cbc:BuyerReference>${escapeXml(invoice.buyerReference)}</cbc:BuyerReference>` : ""}

  ${generatePartyXml(company, true)}
  ${generatePartyXml(buyer, false)}

  ${
    company.iban
      ? `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXml(company.iban)}</cbc:ID>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>`
      : ""
  }

  <cac:PaymentTerms>
    <cbc:Note>Rok plaćanja: 30 dana od datuma računa</cbc:Note>
  </cac:PaymentTerms>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${formatDecimal(invoice.vatAmount)}</cbc:TaxAmount>
    ${Object.values(taxSubtotals)
      .map(
        (subtotal) => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${formatDecimal(subtotal.taxableAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${formatDecimal(subtotal.taxAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${escapeXml(subtotal.category)}</cbc:ID>
        <cbc:Percent>${formatDecimal(subtotal.rate)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
      )
      .join("")}
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${formatDecimal(invoice.netAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${formatDecimal(invoice.netAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${formatDecimal(invoice.totalAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${formatDecimal(invoice.totalAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${lines.map(generateInvoiceLineXml).join("")}
</Invoice>`

  return xml.trim()
}
