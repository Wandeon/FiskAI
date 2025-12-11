/**
 * Types for Croatian Fiscalization System
 * This extends the existing e-invoice types with fiscalization-specific structures
 */

/**
 * Fiscal invoice data for sending to Croatian tax authority (CIS)
 */
export interface FiscalInvoice {
  invoiceNumber: string
  zki: string
  dateTime: Date
  company: {
    oib: string
    name: string
    address: string
  }
  premisesCode: string
  deviceCode: string
  items: FiscalItem[]
  totals: FiscalTotals
  paymentMethod: PaymentMethodCode
  subsequentDelivery?: boolean
  operator?: string
}

/**
 * Fiscal invoice item
 */
export interface FiscalItem {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  total: number
}

/**
 * Fiscal totals with Croatian VAT rates
 */
export interface FiscalTotals {
  net: number       // Total without VAT
  vat25: number     // VAT at 25% (standard rate)
  vat13: number     // VAT at 13% (reduced rate)
  vat5: number      // VAT at 5% (super-reduced rate)
  vat0: number      // VAT at 0% (exempt)
  total: number     // Total with VAT
}

/**
 * Croatian payment method codes (Način plaćanja)
 */
export type PaymentMethodCode = 'G' | 'K' | 'T' | 'O' | 'C'
// G = Gotovina (Cash)
// K = Kartica (Card)
// T = Transakcijski račun (Bank Transfer)
// O = Ostalo (Other)
// C = Ček (Check)

/**
 * Response from fiscalization service
 */
export interface FiscalResponse {
  success: boolean
  jir?: string          // JIR (Jedinstveni Identifikator Računa) - Unique Invoice Identifier
  error?: string
  rawResponse?: string
  errorCode?: string
}

/**
 * Status check response
 */
export interface StatusResponse {
  status: 'PENDING' | 'FISCALIZED' | 'ERROR' | 'CANCELLED'
  jir?: string
  error?: string
  fiscalizedAt?: Date
}

/**
 * Cancellation response
 */
export interface CancelResponse {
  success: boolean
  error?: string
  cancelledAt?: Date
}

/**
 * E-Invoice provider interface for fiscalization
 */
export interface FiscalProvider {
  name: string
  send(invoice: FiscalInvoice): Promise<FiscalResponse>
  getStatus(jir: string): Promise<StatusResponse>
  cancel(jir: string): Promise<CancelResponse>
  testConnection?(): Promise<boolean>
}

/**
 * Fiscal configuration for Croatian system
 */
export interface FiscalConfig {
  enabled: boolean
  provider: 'mock' | 'ie-racuni' | 'fina'
  apiKey?: string
  apiUrl?: string
  certificatePath?: string    // Path to .pfx certificate
  certificatePassword?: string
  sandbox?: boolean           // Use sandbox/test environment
}

/**
 * Business premises for fiscalization
 */
export interface FiscalPremises {
  code: string      // Oznaka poslovnog prostora
  name: string
  address?: string
  workingTime?: string
  isDefault: boolean
}

/**
 * Payment device for fiscalization
 */
export interface FiscalDevice {
  code: string      // Oznaka naplatnog uređaja
  name: string
  premisesCode: string
  isDefault: boolean
}
