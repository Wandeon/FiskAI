import {
  FiscalProvider,
  FiscalInvoice,
  FiscalResponse,
  StatusResponse,
  CancelResponse,
  FiscalConfig
} from '../fiscal-types'

/**
 * IE-Računi Provider for Croatian Fiscalization
 *
 * This provider integrates with IE-Računi service (or similar)
 * to communicate with the Croatian Tax Authority (CIS) system.
 *
 * NOTE: This is a prepared implementation. You need to:
 * 1. Sign up with IE-Računi or another fiscalization provider
 * 2. Obtain API credentials
 * 3. Configure environment variables
 * 4. Test with sandbox environment first
 */
export class IeRacuniProvider implements FiscalProvider {
  name = 'IE-Računi'
  private apiKey: string
  private apiUrl: string
  private sandbox: boolean

  constructor(config?: Partial<FiscalConfig>) {
    this.apiKey = config?.apiKey || process.env.IE_RACUNI_API_KEY || ''
    this.apiUrl = config?.apiUrl || process.env.IE_RACUNI_API_URL || 'https://api.ie-racuni.hr/v1'
    this.sandbox = config?.sandbox ?? (process.env.IE_RACUNI_SANDBOX === 'true')

    if (this.sandbox) {
      this.apiUrl = 'https://sandbox.ie-racuni.hr/v1'
    }
  }

  async send(invoice: FiscalInvoice): Promise<FiscalResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'IE-Računi API key not configured. Please set IE_RACUNI_API_KEY environment variable.',
        errorCode: 'CONFIG_ERROR'
      }
    }

    try {
      const payload = this.transformToApiFormat(invoice)

      const response = await fetch(`${this.apiUrl}/fiscalize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok && data.jir) {
        return {
          success: true,
          jir: data.jir,
          rawResponse: JSON.stringify(data)
        }
      }

      return {
        success: false,
        error: data.message || data.error || 'Unknown error from IE-Računi',
        errorCode: data.code || 'API_ERROR',
        rawResponse: JSON.stringify(data)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: 'NETWORK_ERROR'
      }
    }
  }

  async getStatus(jir: string): Promise<StatusResponse> {
    if (!this.apiKey) {
      return {
        status: 'ERROR',
        error: 'IE-Računi API key not configured'
      }
    }

    try {
      const response = await fetch(`${this.apiUrl}/invoice/${encodeURIComponent(jir)}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        return {
          status: this.mapStatus(data.status),
          jir,
          fiscalizedAt: data.fiscalizedAt ? new Date(data.fiscalizedAt) : undefined
        }
      }

      return {
        status: 'ERROR',
        error: data.message || 'Failed to get status'
      }
    } catch (error) {
      return {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  async cancel(jir: string): Promise<CancelResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'IE-Računi API key not configured'
      }
    }

    try {
      const response = await fetch(`${this.apiUrl}/invoice/${encodeURIComponent(jir)}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        return {
          success: true,
          cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : new Date()
        }
      }

      return {
        success: false,
        error: data.message || 'Failed to cancel invoice'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false
    }

    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      })

      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Transform FiscalInvoice to IE-Računi API format
   * NOTE: This is a placeholder. Actual format depends on IE-Računi API specification
   */
  private transformToApiFormat(invoice: FiscalInvoice) {
    return {
      // Invoice identification
      broj_racuna: invoice.invoiceNumber,
      zki: invoice.zki,
      datum_vrijeme: invoice.dateTime.toISOString(),

      // Company data
      oib: invoice.company.oib,
      naziv: invoice.company.name,
      adresa: invoice.company.address,

      // Business premises and device
      oznaka_prostora: invoice.premisesCode,
      oznaka_uredjaja: invoice.deviceCode,

      // Payment method
      nacin_placanja: invoice.paymentMethod,

      // Subsequent delivery flag
      naknadna_dostava: invoice.subsequentDelivery || false,

      // Operator (optional)
      operater: invoice.operator,

      // Invoice items
      stavke: invoice.items.map((item, index) => ({
        rb: index + 1,
        naziv: item.description,
        kolicina: item.quantity,
        jedinica_mjere: 'kom', // or from item
        cijena: item.unitPrice,
        stopa_pdv: item.vatRate,
        ukupno: item.total
      })),

      // Totals
      ukupno_bez_pdv: invoice.totals.net,
      pdv_25: invoice.totals.vat25,
      pdv_13: invoice.totals.vat13,
      pdv_5: invoice.totals.vat5,
      pdv_0: invoice.totals.vat0,
      ukupno_s_pdv: invoice.totals.total
    }
  }

  /**
   * Map IE-Računi status to our internal status
   */
  private mapStatus(apiStatus: string): StatusResponse['status'] {
    switch (apiStatus?.toUpperCase()) {
      case 'FISCALIZED':
      case 'COMPLETED':
        return 'FISCALIZED'
      case 'PENDING':
      case 'PROCESSING':
        return 'PENDING'
      case 'CANCELLED':
        return 'CANCELLED'
      default:
        return 'ERROR'
    }
  }
}
