// src/lib/regulatory-truth/utils/rate-limiter.ts

interface RateLimitConfig {
  requestDelayMs: number
  maxRequestsPerMinute: number
  maxConcurrentRequests: number
}

interface DomainStats {
  lastRequestAt: number
  requestsThisMinute: number
  consecutiveErrors: number
  isCircuitBroken: boolean
  circuitBrokenAt?: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  requestDelayMs: 2000, // 2 seconds between requests
  maxRequestsPerMinute: 20,
  maxConcurrentRequests: 1,
}

const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_RESET_MS = 60 * 60 * 1000 // 1 hour

class DomainRateLimiter {
  private domainStats: Map<string, DomainStats> = new Map()
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private getStats(domain: string): DomainStats {
    if (!this.domainStats.has(domain)) {
      this.domainStats.set(domain, {
        lastRequestAt: 0,
        requestsThisMinute: 0,
        consecutiveErrors: 0,
        isCircuitBroken: false,
      })
    }
    return this.domainStats.get(domain)!
  }

  async waitForSlot(domain: string): Promise<void> {
    const stats = this.getStats(domain)

    // Check circuit breaker
    if (stats.isCircuitBroken) {
      const timeSinceBroken = Date.now() - (stats.circuitBrokenAt || 0)
      if (timeSinceBroken < CIRCUIT_BREAKER_RESET_MS) {
        throw new Error(
          `Circuit breaker open for ${domain}. Resets in ${Math.round((CIRCUIT_BREAKER_RESET_MS - timeSinceBroken) / 1000 / 60)} minutes`
        )
      }
      // Auto-reset circuit breaker
      stats.isCircuitBroken = false
      stats.consecutiveErrors = 0
    }

    // Wait for rate limit delay
    const timeSinceLastRequest = Date.now() - stats.lastRequestAt
    if (timeSinceLastRequest < this.config.requestDelayMs) {
      const waitTime = this.config.requestDelayMs - timeSinceLastRequest
      await this.delay(waitTime)
    }

    stats.lastRequestAt = Date.now()
    stats.requestsThisMinute++
  }

  recordSuccess(domain: string): void {
    const stats = this.getStats(domain)
    stats.consecutiveErrors = 0
  }

  recordError(domain: string): void {
    const stats = this.getStats(domain)
    stats.consecutiveErrors++

    if (stats.consecutiveErrors >= CIRCUIT_BREAKER_THRESHOLD) {
      stats.isCircuitBroken = true
      stats.circuitBrokenAt = Date.now()
      console.log(
        `[rate-limiter] Circuit breaker OPEN for ${domain} after ${stats.consecutiveErrors} consecutive errors`
      )
    }
  }

  resetCircuitBreaker(domain: string): void {
    const stats = this.getStats(domain)
    stats.isCircuitBroken = false
    stats.consecutiveErrors = 0
    console.log(`[rate-limiter] Circuit breaker RESET for ${domain}`)
  }

  getStatus(domain: string): { isCircuitBroken: boolean; consecutiveErrors: number } {
    const stats = this.getStats(domain)
    return {
      isCircuitBroken: stats.isCircuitBroken,
      consecutiveErrors: stats.consecutiveErrors,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const rateLimiter = new DomainRateLimiter()

// Helper function for fetching with rate limiting
export async function fetchWithRateLimit(url: string, options?: RequestInit): Promise<Response> {
  const domain = new URL(url).hostname

  await rateLimiter.waitForSlot(domain)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "User-Agent": "FiskAI/1.0 (regulatory-monitoring; +https://fiskai.hr)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "hr,en;q=0.9",
        ...options?.headers,
      },
    })

    if (response.ok) {
      rateLimiter.recordSuccess(domain)
    } else if (response.status >= 500 || response.status === 429) {
      rateLimiter.recordError(domain)
    }

    return response
  } catch (error) {
    rateLimiter.recordError(domain)
    throw error
  }
}

export { DomainRateLimiter }
