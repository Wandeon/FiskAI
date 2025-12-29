# External Dependencies Analysis

> Last updated: 2025-12-29

This document outlines all external service dependencies in FiskAI, categorizing them as **essential** (cannot be self-hosted) or **replaceable** (can be self-hosted).

## Summary

| Category | Essential | Replaceable | Self-Hosted Option |
|----------|-----------|-------------|-------------------|
| Fiscalization | CIS/Porezna | - | - |
| E-Invoice | Information Intermediary | - | - |
| Company Lookup | VIES, Sudski Registar | - | - |
| Email | - | Resend | SMTP/NodeMailer |
| AI/LLM | - | OpenAI, DeepSeek | Ollama |
| Storage | - | R2 | MinIO |
| Analytics | - | PostHog, Sentry | Self-hosted versions |
| Banking | - | GoCardless | Direct bank APIs |

---

## Essential External Services (Cannot Self-Host)

### 1. Croatian Tax Authority (CIS/Porezna)

**Purpose:** Invoice fiscalization - legal requirement for Croatian businesses.

**Endpoints:**
- Test: `https://cistest.apis-it.hr:8449`
- Production: `https://cis.porezna-uprava.hr:8449`

**Cannot be replaced:** This is a government service required by law.

**Files:** `src/lib/fiscal/porezna-client.ts`

---

### 2. E-Invoice Information Intermediary

**Purpose:** B2B e-invoice exchange (mandatory from Jan 1, 2026 for VAT businesses).

**Options:**
- IE-Računi (partially implemented)
- Moj-eRačun (not implemented)
- FINA (not implemented)

**Cannot be replaced:** Croatian law requires using a certified intermediary for e-invoice exchange.

**Files:** `src/lib/e-invoice/providers/`

---

### 3. Government APIs

**VIES (EU VAT Validation)**
- Purpose: Validate EU VAT numbers
- No authentication required
- Cannot be replaced: Official EU service

**Sudski Registar (Croatian Court Registry)**
- Purpose: Company data lookup
- Requires OAuth credentials
- Cannot be replaced: Official government registry

**Files:** `src/lib/oib-lookup.ts`

---

## Replaceable Services (Can Self-Host)

### 1. Email Service

**Current:** Resend (external SaaS)
**Self-Hosted Alternative:** SMTP via NodeMailer

**Configuration:**
```env
# Self-hosted SMTP (preferred)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=FiskAI <noreply@fiskai.hr>

# Fallback to Resend (if SMTP not configured)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=FiskAI <noreply@fiskai.hr>
```

**Priority:** SMTP (if configured) → Resend (fallback)

**Files:** `src/lib/email.ts`

---

### 2. AI/LLM Services

**Current:** OpenAI, DeepSeek
**Self-Hosted Alternative:** Ollama

**Configuration:**
```env
# Self-hosted Ollama (preferred)
OLLAMA_ENDPOINT=http://ollama.internal:11434
OLLAMA_API_KEY=optional-key
OLLAMA_MODEL=qwen3-next:80b
OLLAMA_VISION_MODEL=llama3.2-vision

# News/classification provider priority
AI_PROVIDER=ollama  # or openai, deepseek

# Fallback to cloud providers
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
```

**Provider Priority:**
1. Ollama (if `OLLAMA_API_KEY` set)
2. DeepSeek (if `DEEPSEEK_API_KEY` set)
3. OpenAI (if `OPENAI_API_KEY` set)

**Current Implementation:**
- News pipeline: Supports Ollama, DeepSeek, OpenAI (`src/lib/news/pipeline/deepseek-client.ts`)
- Regulatory Truth OCR: Uses Ollama vision (`src/lib/regulatory-truth/utils/vision-ocr.ts`)
- Receipt OCR: Currently OpenAI only (`src/lib/ai/ocr.ts`) - TODO: Add Ollama support

**Files:**
- `src/lib/news/pipeline/deepseek-client.ts`
- `src/lib/regulatory-truth/utils/vision-ocr.ts`
- `src/lib/ai/ocr.ts`

---

### 3. Object Storage

**Current:** Cloudflare R2
**Self-Hosted Alternative:** MinIO (S3-compatible)

**Configuration:**
```env
# Current R2 configuration
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=fiskai-documents

# MinIO alternative (same SDK, just different endpoint)
R2_ENDPOINT=http://minio.internal:9000
```

**Files:** `src/lib/r2-client.ts`

---

### 4. Analytics & Monitoring

**Current:** PostHog (analytics), Sentry (errors)
**Self-Hosted Alternatives:**
- PostHog: Self-hosted PostHog
- Sentry: Self-hosted Sentry or Glitchtip

**Configuration:**
```env
# PostHog (can be self-hosted)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://posthog.yourdomain.com

# Sentry (can be self-hosted)
SENTRY_DSN=https://xxx@sentry.yourdomain.com/project
```

**Files:**
- `src/lib/analytics.ts`
- `instrumentation.ts`

---

### 5. Banking Integration

**Current:** GoCardless (Open Banking aggregator)
**Alternative:** Direct bank API integrations

GoCardless simplifies integration with 2000+ banks via PSD2. Replacing requires:
- Individual API agreements with banks
- Separate implementations per bank
- AISP license (costly and time-consuming)

**Recommendation:** Keep GoCardless for now, but design for future bank-direct integrations.

**Files:** `src/lib/bank-sync/providers/gocardless.ts`

---

## Environment Configuration for Maximum Self-Hosting

```env
# ============================================
# MINIMAL EXTERNAL DEPENDENCIES CONFIGURATION
# ============================================

# Database (self-hosted)
DATABASE_URL=postgresql://user:pass@db.internal:5432/fiskai

# Email (self-hosted SMTP)
SMTP_HOST=smtp.internal
SMTP_PORT=587
SMTP_USER=fiskai
SMTP_PASSWORD=secure-password
EMAIL_FROM=FiskAI <noreply@fiskai.hr>

# AI (self-hosted Ollama)
OLLAMA_ENDPOINT=http://ollama.internal:11434
OLLAMA_MODEL=qwen3-next:80b
OLLAMA_VISION_MODEL=llama3.2-vision
AI_PROVIDER=ollama

# Storage (self-hosted MinIO)
R2_ENDPOINT=http://minio.internal:9000
R2_ACCESS_KEY_ID=minioaccess
R2_SECRET_ACCESS_KEY=miniosecret
R2_BUCKET_NAME=fiskai

# Analytics (self-hosted or disabled)
NEXT_PUBLIC_POSTHOG_KEY=  # Leave empty to disable
SENTRY_DSN=  # Leave empty to disable

# Redis (self-hosted)
REDIS_URL=redis://redis.internal:6379

# ============================================
# REQUIRED EXTERNAL SERVICES (cannot avoid)
# ============================================

# Croatian Tax Authority
# No config needed - endpoints are hardcoded

# Sudski Registar (Croatian Court Registry)
SUDSKI_REGISTAR_CLIENT_ID=from-court-registry
SUDSKI_REGISTAR_SECRET=from-court-registry

# E-Invoice Intermediary (pick one)
IE_RACUNI_API_KEY=from-provider
IE_RACUNI_API_URL=https://api.ie-racuni.hr/v1

# Payment Processing (Stripe is complex to replace)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 2026 Compliance Notes

### Fiscalization Changes (Fiskalizacija 2.0)

From January 1, 2026:
- B2C bank transfers MUST be fiscalized (implemented in `src/lib/fiscal/should-fiscalize.ts`)
- B2B bank transfers remain exempt
- Mandatory e-invoicing for VAT-registered businesses

### E-Invoice Requirements

You MUST integrate with an Information Intermediary (IE-Računi, Moj-eRačun, or FINA) for:
- Sending e-invoices to other businesses
- Receiving e-invoices from other businesses

This cannot be self-hosted as it requires certified intermediary status.

---

## Migration Priority

1. **Done:** Email service now supports SMTP (NodeMailer) as primary
2. **Done:** AI provider prioritizes Ollama where available
3. **TODO:** Add Ollama support to `src/lib/ai/ocr.ts` for receipt scanning
4. **Consider:** Self-hosted MinIO for storage
5. **Consider:** Self-hosted PostHog/Sentry for analytics
6. **Keep:** GoCardless (bank aggregation complexity), Stripe (payment complexity)

---

## Cost Comparison

| Service | External Cost | Self-Hosted Cost |
|---------|--------------|------------------|
| Resend | ~$20-100/mo (volume) | ~$0 (existing server) |
| OpenAI | ~$50-500/mo (usage) | ~$0-100/mo (GPU) |
| R2 | ~$10-50/mo (storage) | ~$0 (disk space) |
| PostHog | Free tier or $0+ | ~$0 (container) |
| GoCardless | Per-transaction | N/A |
| Stripe | 2.9% + fees | N/A |

**Potential monthly savings:** $80-650 by self-hosting email, AI, and storage.
