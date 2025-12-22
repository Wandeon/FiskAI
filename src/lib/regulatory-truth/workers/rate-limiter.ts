// src/lib/regulatory-truth/workers/rate-limiter.ts
import Bottleneck from "bottleneck"

// Domain-specific delays (ms)
const DOMAIN_DELAYS: Record<string, { min: number; max: number }> = {
  "narodne-novine.nn.hr": { min: 3000, max: 5000 },
  "porezna-uprava.gov.hr": { min: 4000, max: 6000 },
  "hzzo.hr": { min: 5000, max: 8000 },
  "mirovinsko.hr": { min: 5000, max: 8000 },
  "fina.hr": { min: 3000, max: 5000 },
  "mfin.gov.hr": { min: 4000, max: 6000 },
  "eur-lex.europa.eu": { min: 2000, max: 4000 },
}

export function getDomainDelay(domain: string): number {
  const config = DOMAIN_DELAYS[domain] || { min: 3000, max: 5000 }
  return config.min + Math.random() * (config.max - config.min)
}

// Shared LLM rate limiter (across all workers in same process)
export const llmLimiter = new Bottleneck({
  reservoir: 5, // 5 concurrent calls
  reservoirRefreshAmount: 5,
  reservoirRefreshInterval: 60000, // Refill every minute
  maxConcurrent: 5,
  minTime: 1000, // Min 1s between calls
})

// Per-domain limiters
const domainLimiters = new Map<string, Bottleneck>()

export function getDomainLimiter(domain: string): Bottleneck {
  if (!domainLimiters.has(domain)) {
    const delay = DOMAIN_DELAYS[domain] || { min: 3000, max: 5000 }
    domainLimiters.set(
      domain,
      new Bottleneck({
        maxConcurrent: 1,
        minTime: delay.min,
      })
    )
  }
  return domainLimiters.get(domain)!
}
