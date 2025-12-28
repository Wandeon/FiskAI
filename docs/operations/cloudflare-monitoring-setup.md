# Cloudflare Monitoring Setup for Phase A SLOs

## Prerequisites

- Cloudflare Pro plan or higher (for Analytics)
- Access to Cloudflare dashboard for fiskai.hr zone

## Dashboard Setup

### 1. Cache Analytics

Navigate to: **Analytics & Logs > Cache**

Key metrics to monitor:

- Cache hit rate (target: ≥95% for KB routes)
- Bandwidth saved
- Requests served from cache vs origin

### 2. Web Analytics

Navigate to: **Analytics & Logs > Web Analytics**

Enable if not already enabled. Tracks:

- Page views by route
- Core Web Vitals (LCP, FID, CLS)
- TTFB at edge

### 3. Create Custom Notifications

Navigate to: **Notifications**

Create alerts for:

| Alert Name           | Condition                | Threshold         |
| -------------------- | ------------------------ | ----------------- |
| Cache Hit Drop       | Cache hit rate           | <90% for 30min    |
| Origin Latency Spike | Origin response time p95 | >1000ms for 10min |
| Error Rate Spike     | 5xx error rate           | >0.5% for 5min    |

### 4. Traffic Analytics

Navigate to: **Analytics & Logs > Traffic**

Filter by:

- Path prefix: `/vodic/*`, `/rjecnik/*`, `/kako-da/*`
- Bot traffic (for Phase B observability)

## Verification

After setup, verify:

1. Cache headers present:

   ```bash
   curl -I https://fiskai.hr/vodic/pausalni-obrt | grep -i "cf-cache-status\|cache-control"
   ```

   Expected: `cf-cache-status: HIT` or `MISS` (first request)

2. Cache tags present:
   ```bash
   curl -I https://fiskai.hr/vodic/pausalni-obrt | grep -i "cache-tag"
   ```
   Expected: `cache-tag: kb_guides, kb_all`

## Runbook Links

- [Cache Purge API](/docs/plans/2025-12-27-phase-a-edge-trust-plan.md#task-a2)
- [SLO Definitions](/docs/slos/performance-slos.md)
