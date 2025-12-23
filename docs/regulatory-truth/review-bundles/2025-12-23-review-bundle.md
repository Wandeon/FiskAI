# Daily Review Bundle

**Generated:** 2025-12-23T22:29:36.810Z
**Total items:** 3
**By risk tier:** T0=3
**By domain:** exchange-rate=3

---

## Quick Approve All

```bash
npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "cmjh7iv7t001356waytc1gewm,cmjh7iv6k000y56wapu263zab,cmjh7iv52000t56wa099971u3"
```

**Note:** This will approve all 3 rules in this bundle. Review each item below before running.

---

## Items for Review

### exchange-rate-eur-sek

- **Title:** Tečaj EUR/SEK za 2025-12-22
- **Value:** 10.904 (decimal)
- **Risk Tier:** T0
- **Confidence:** 100%
- **Sources:** 1
- **Waiting:** 11.7 hours
- **Effective From:** 2025-12-22
- **Domain:** exchange-rate

**Source quotes:**

1. ""srednji_tecaj": "10,904000""

**Source URLs:**

1. https://api.hnb.hr/tecajn-eur/v3?datum-primjene=2025-12-22&valuta=SEK

**Individual approve:**

```bash
npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "cmjh7iv7t001356waytc1gewm"
```

**Individual reject:**

```bash
npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "cmjh7iv7t001356waytc1gewm" --reject
```

---

### exchange-rate-eur-nok

- **Title:** Tečaj EUR/NOK za 2025-12-22
- **Value:** 11.915 (decimal)
- **Risk Tier:** T0
- **Confidence:** 100%
- **Sources:** 1
- **Waiting:** 11.7 hours
- **Effective From:** 2025-12-22
- **Domain:** exchange-rate

**Source quotes:**

1. ""srednji_tecaj": "11,915000""

**Source URLs:**

1. https://api.hnb.hr/tecajn-eur/v3?datum-primjene=2025-12-22&valuta=NOK

**Individual approve:**

```bash
npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "cmjh7iv6k000y56wapu263zab"
```

**Individual reject:**

```bash
npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "cmjh7iv6k000y56wapu263zab" --reject
```

---

### exchange-rate-eur-jpy

- **Title:** Tečaj EUR/JPY za 2025-12-22
- **Value:** 184.15 (decimal)
- **Risk Tier:** T0
- **Confidence:** 100%
- **Sources:** 1
- **Waiting:** 11.7 hours
- **Effective From:** 2025-12-22
- **Domain:** exchange-rate

**Source quotes:**

1. ""srednji_tecaj": "184,150000""

**Source URLs:**

1. https://api.hnb.hr/tecajn-eur/v3?datum-primjene=2025-12-22&valuta=JPY

**Individual approve:**

```bash
npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "cmjh7iv52000t56wa099971u3"
```

**Individual reject:**

```bash
npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "cmjh7iv52000t56wa099971u3" --reject
```

---
