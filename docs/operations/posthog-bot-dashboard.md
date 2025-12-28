# PostHog AI Bot Activity Dashboard Specification

## Dashboard: "AI Crawler Observability"

### Insight 1: Hits per Bot per Day

**Type:** Line chart
**Event:** `ai_crawler_hit`
**Breakdown:** `bot_name`
**Date range:** Last 30 days
**Granularity:** Daily

### Insight 2: Top Crawled Pages (7d)

**Type:** Table
**Event:** `ai_crawler_hit`
**Breakdown:** `path`
**Aggregation:** Count
**Date range:** Last 7 days
**Limit:** 50 rows

### Insight 3: Crawl by Bot Type

**Type:** Pie chart
**Event:** `ai_crawler_hit`
**Breakdown:** `bot_name`
**Date range:** Last 30 days

### Insight 4: Cache Hit Rate for Bots

**Type:** Bar chart
**Event:** `ai_crawler_hit`
**Breakdown:** `response_cache`
**Date range:** Last 7 days

### Insight 5: New Pages Discovered

**Type:** Table
**Event:** `ai_crawler_hit` (first occurrence)
**Breakdown:** `path`
**Aggregation:** First seen date
**Date range:** Last 30 days

### Insight 6: Content Type Distribution

**Type:** Pie chart
**Event:** `ai_crawler_hit`
**Breakdown:** `content_type`

## Key Questions This Answers

1. Which AI bots are crawling us most frequently?
2. What content do AI bots find most valuable?
3. Are AI bots getting cached responses?
4. Are there paths we should add to sitemap?
5. Is crawler activity increasing over time?

## Implementation

1. Create dashboard in PostHog UI
2. Add 6 insights as specified
3. Add dashboard to weekly review checklist
