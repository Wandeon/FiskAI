# FiskAI Performance SLOs

> Last updated: 2025-12-28 | Owner: Platform Team

## Edge SLOs (Cloudflare)

| Route Group                                                         | Metric               | Target | Alert Threshold   |
| ------------------------------------------------------------------- | -------------------- | ------ | ----------------- |
| Marketing/KB (`/vodic/*`, `/rjecnik/*`, `/kako-da/*`, `/vijesti/*`) | TTFB p75             | ≤100ms | >150ms for 15min  |
| Marketing/KB                                                        | TTFB p95             | ≤250ms | >300ms for 15min  |
| Marketing/KB                                                        | Cache Hit Rate       | ≥95%   | <90% for 30min    |
| App Shell (`/app/*`, `/staff/*`, `/admin/*`)                        | TTFB p75             | ≤200ms | >300ms for 15min  |
| All Routes                                                          | Origin Response Time | ≤500ms | >1000ms for 10min |
| All Routes                                                          | 5xx Error Rate       | <0.1%  | >0.5% for 5min    |

## Client SLOs (PostHog CWV)

| Metric        | Target (p75) | Alert Threshold   |
| ------------- | ------------ | ----------------- |
| LCP           | ≤2.5s        | >3.0s for 30min   |
| CLS           | ≤0.1         | >0.15 for 30min   |
| INP           | ≤200ms       | >300ms for 30min  |
| TTFB (client) | ≤800ms       | >1000ms for 30min |

## Measurement

- **Cloudflare:** Analytics dashboard + Notifications
- **PostHog:** `web_vital` events with route_group tagging

## Review Cadence

- Weekly: Check dashboards for trends
- Monthly: Review SLO breaches and adjust targets if needed
- Post-deploy: Verify no regression in first 30min
