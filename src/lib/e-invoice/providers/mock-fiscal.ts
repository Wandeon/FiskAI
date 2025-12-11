import {
  FiscalProvider,
  FiscalInvoice,
  FiscalResponse,
  StatusResponse,
  CancelResponse
} from '../fiscal-types'

/**
 * Mock Fiscal Provider for Development and Testing
 *
 * This provider simulates the Croatian fiscalization system (CIS)
 * without actually connecting to the real tax authority servers.
 *
 * Use this for:
 * - Local development
 * - Testing workflows
 * - Demo environments
 */
export class MockFiscalProvider implements FiscalProvider {
  name = 'Mock Fiscal Provider (Development)'

  private fiscalizedInvoices = new Map<string, {
    jir: string
    zki: string
    fiscalizedAt: Date
    invoice: FiscalInvoice
  }>()

  async send(invoice: FiscalInvoice): Promise<FiscalResponse> {
    // Simulate API delay (500-800ms)
    await this.delay(500 + Math.random() * 300)

    // Validate invoice data
    const validation = this.validateInvoice(invoice)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        errorCode: 'VALIDATION_ERROR'
      }
    }

    // Generate mock JIR (Jedinstveni Identifikator Računa)
    // Format similar to real JIR: UUID-like string
    const jir = this.generateJIR()

    // Store in memory for status checks
    this.fiscalizedInvoices.set(jir, {
      jir,
      zki: invoice.zki,
      fiscalizedAt: new Date(),
      invoice
    })

    console.log(`[MockFiscalProvider] Invoice ${invoice.invoiceNumber} fiscalized`)
    console.log(`[MockFiscalProvider] JIR: ${jir}`)
    console.log(`[MockFiscalProvider] ZKI: ${invoice.zki}`)

    return {
      success: true,
      jir,
      rawResponse: JSON.stringify({
        status: 'OK',
        jir,
        timestamp: new Date().toISOString()
      })
    }
  }

  async getStatus(jir: string): Promise<StatusResponse> {
    await this.delay(200)

    const record = this.fiscalizedInvoices.get(jir)

    if (!record) {
      return {
        status: 'ERROR',
        error: 'JIR not found'
      }
    }

    return {
      status: 'FISCALIZED',
      jir,
      fiscalizedAt: record.fiscalizedAt
    }
  }

  async cancel(jir: string): Promise<CancelResponse> {
    await this.delay(300)

    const record = this.fiscalizedInvoices.get(jir)

    if (!record) {
      return {
        success: false,
        error: 'JIR not found'
      }
    }

    // In mock mode, we just mark it as cancelled
    this.fiscalizedInvoices.delete(jir)

    return {
      success: true,
      cancelledAt: new Date()
    }
  }

  async testConnection(): Promise<boolean> {
    await this.delay(100)
    return true
  }

  /**
   * Generate a mock JIR (Jedinstveni Identifikator Računa)
   * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  private generateJIR(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2)

    // Create a UUID-like format
    const parts = [
      timestamp.substring(0, 8),
      random.substring(0, 4),
      random.substring(4, 8),
      random.substring(8, 12),
      (timestamp + random).substring(0, 12)
    ]

    return parts.join('-')
  }

  /**
   * Validate invoice data before fiscalization
   */
  private validateInvoice(invoice: FiscalInvoice): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate OIB
    if (!/^\d{11}$/.test(invoice.company.oib)) {
      errors.push('Invalid OIB format (must be 11 digits)')
    }

    // Validate invoice number
    if (!invoice.invoiceNumber || invoice.invoiceNumber.trim().length === 0) {
      errors.push('Invoice number is required')
    }

    // Validate ZKI
    if (!invoice.zki || invoice.zki.length !== 32) {
      errors.push('Invalid ZKI format (must be 32 characters)')
    }

    // Validate premises and device codes
    if (!invoice.premisesCode || invoice.premisesCode.trim().length === 0) {
      errors.push('Premises code is required')
    }

    if (!invoice.deviceCode || invoice.deviceCode.trim().length === 0) {
      errors.push('Device code is required')
    }

    // Validate totals
    if (invoice.totals.total <= 0) {
      errors.push('Total amount must be positive')
    }

    // Validate items
    if (!invoice.items || invoice.items.length === 0) {
      errors.push('At least one item is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
