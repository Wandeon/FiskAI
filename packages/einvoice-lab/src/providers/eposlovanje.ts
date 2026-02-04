/**
 * E-Poslovanje Provider for Croatian E-Invoicing
 *
 * API Documentation: https://doc.eposlovanje.hr
 * Test Environment: https://test.eposlovanje.hr
 * Production: https://eracun.eposlovanje.hr
 *
 * API v2 - supports UBL 2.1 Invoice/CreditNote
 *
 * Connection verified: 2026-02-04
 */

export interface EPoslovanjeSendRequest {
  document: string // UBL 2.1 XML
  softwareId: string // Required: software identifier
  sendAsEmail?: boolean // Optional: send as email to B2C
}

export interface EPoslovanjeSendResponse {
  id: number // Document ID in e-poslovanje system
  insertedOn: string // ISO-8601 timestamp
  message: string // Status message
}

export interface EPoslovanjeStatusResponse {
  id: number
  transportStatus: string
  businessStatus: string
  eReportingStatus: string
  modifiedOn: string
}

export interface EPoslovanjeErrorResponse {
  errorCode: string
  errorMessage: string
}

export interface EPoslovanjeConfig {
  apiKey: string
  apiUrl?: string // Defaults to test.eposlovanje.hr
  softwareId?: string // Defaults to "FISKAI-001"
}

export class EPoslovanjeProvider {
  readonly name = "e-Poslovanje"
  private apiKey: string
  private apiUrl: string
  private softwareId: string

  constructor(config: EPoslovanjeConfig) {
    this.apiKey = config.apiKey
    this.apiUrl =
      config.apiUrl ||
      process.env.EPOSLOVANJE_API_BASE ||
      "https://test.eposlovanje.hr"
    this.softwareId = config.softwareId || "FISKAI-001"
  }

  /**
   * Test connection to e-Poslovanje API
   */
  async ping(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.apiUrl}/api/v2/ping`, {
      method: "GET",
      headers: {
        Authorization: this.apiKey,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Ping failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Send UBL 2.1 document (Invoice or CreditNote)
   */
  async sendDocument(
    ublXml: string,
    options?: { sendAsEmail?: boolean }
  ): Promise<EPoslovanjeSendResponse> {
    const payload: EPoslovanjeSendRequest = {
      document: ublXml,
      softwareId: this.softwareId,
      sendAsEmail: options?.sendAsEmail,
    }

    const response = await fetch(`${this.apiUrl}/api/v2/document/send`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data as EPoslovanjeErrorResponse
      throw new Error(`Send failed: ${error.errorCode} - ${error.errorMessage}`)
    }

    return data as EPoslovanjeSendResponse
  }

  /**
   * Get document by ID
   */
  async getDocument(id: number): Promise<{ document: string }> {
    const response = await fetch(`${this.apiUrl}/api/v2/document/get/${id}`, {
      method: "GET",
      headers: {
        Authorization: this.apiKey,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(
        `Get document failed: ${response.status} ${response.statusText}`
      )
    }

    return response.json()
  }

  /**
   * Get document status
   */
  async getStatus(id: number): Promise<EPoslovanjeStatusResponse> {
    const response = await fetch(`${this.apiUrl}/api/v2/document/status/${id}`, {
      method: "GET",
      headers: {
        Authorization: this.apiKey,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(
        `Get status failed: ${response.status} ${response.statusText}`
      )
    }

    return response.json()
  }

  /**
   * Get incoming documents
   */
  async getIncoming(options?: {
    limit?: number
    offset?: number
    insertedFrom?: string
    insertedTo?: string
  }): Promise<unknown[]> {
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", options.limit.toString())
    if (options?.offset) params.set("offset", options.offset.toString())
    if (options?.insertedFrom) params.set("insertedFrom", options.insertedFrom)
    if (options?.insertedTo) params.set("insertedTo", options.insertedTo)

    const url = `${this.apiUrl}/api/v2/document/incoming${params.toString() ? `?${params}` : ""}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: this.apiKey,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(
        `Get incoming failed: ${response.status} ${response.statusText}`
      )
    }

    return response.json()
  }

  /**
   * Get outgoing documents
   */
  async getOutgoing(options?: {
    limit?: number
    offset?: number
    insertedFrom?: string
    insertedTo?: string
  }): Promise<unknown[]> {
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", options.limit.toString())
    if (options?.offset) params.set("offset", options.offset.toString())
    if (options?.insertedFrom) params.set("insertedFrom", options.insertedFrom)
    if (options?.insertedTo) params.set("insertedTo", options.insertedTo)

    const url = `${this.apiUrl}/api/v2/document/outgoing${params.toString() ? `?${params}` : ""}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: this.apiKey,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(
        `Get outgoing failed: ${response.status} ${response.statusText}`
      )
    }

    return response.json()
  }

  /**
   * Validate document without sending
   */
  async validateDocument(ublXml: string): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await fetch(`${this.apiUrl}/api/v2/document/validate`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        document: ublXml,
        softwareId: this.softwareId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data as EPoslovanjeErrorResponse
      return {
        valid: false,
        errors: [`${error.errorCode}: ${error.errorMessage}`],
      }
    }

    return { valid: true }
  }
}

/**
 * Create e-Poslovanje provider with environment config
 */
export function createEPoslovanjeProvider(
  config?: Partial<EPoslovanjeConfig>
): EPoslovanjeProvider {
  const apiKey =
    config?.apiKey || process.env.EPOSLOVANJE_API_KEY || ""

  if (!apiKey) {
    throw new Error(
      "E-Poslovanje API key required. Set EPOSLOVANJE_API_KEY environment variable."
    )
  }

  return new EPoslovanjeProvider({
    apiKey,
    apiUrl: config?.apiUrl,
    softwareId: config?.softwareId,
  })
}
