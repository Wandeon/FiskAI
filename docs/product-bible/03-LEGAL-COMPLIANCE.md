# Legal & Compliance

[← Back to Index](./00-INDEX.md)

---

## 4. Legal Forms & Compliance Requirements

### 4.1 Croatian Business Types

| Legal Form     | Code          | Min Capital | Tax Regime    | Accounting   | VAT      |
| -------------- | ------------- | ----------- | ------------- | ------------ | -------- |
| Paušalni Obrt  | `OBRT_PAUSAL` | 0 EUR       | Flat-rate 12% | Single-entry | NO       |
| Obrt (Dohodak) | `OBRT_REAL`   | 0 EUR       | Income tax    | Single-entry | Optional |
| Obrt (PDV)     | `OBRT_VAT`    | 0 EUR       | Income + VAT  | Single-entry | YES      |
| j.d.o.o.       | `JDOO`        | 1 EUR       | Corporate     | Double-entry | YES      |
| d.o.o.         | `DOO`         | 2,500 EUR   | Corporate     | Double-entry | YES      |

### 4.2 Module Requirements by Legal Form

| Module               | OBRT_PAUSAL | OBRT_REAL  | OBRT_VAT   | JDOO       | DOO        |
| -------------------- | ----------- | ---------- | ---------- | ---------- | ---------- |
| Invoicing            | ✅          | ✅         | ✅         | ✅         | ✅         |
| KPR (Sales Log)      | ✅          | ❌         | ❌         | ❌         | ❌         |
| KPI (Income/Expense) | ❌          | ✅         | ✅         | ❌         | ❌         |
| PO-SD (Annual Form)  | ✅          | ❌         | ❌         | ❌         | ❌         |
| DOH (Income Tax)     | ❌          | ✅         | ✅         | ❌         | ❌         |
| URA/IRA              | ❌          | ✅         | ✅         | ✅         | ✅         |
| PDV Forms            | ❌          | ⚠️ IF VAT  | ✅         | ✅         | ✅         |
| Assets (DI)          | ❌          | ✅         | ✅         | ✅         | ✅         |
| Corporate Tax        | ❌          | ❌         | ❌         | ✅         | ✅         |
| JOPPD                | ❌          | ⚠️ IF EMP  | ⚠️ IF EMP  | ⚠️ IF EMP  | ⚠️ IF EMP  |
| Fiscalization        | ⚠️ IF CASH  | ⚠️ IF CASH | ⚠️ IF CASH | ⚠️ IF CASH | ⚠️ IF CASH |

### 4.3 The 20 Scenarios Matrix

Every possible combination of legal form × VAT × cash × employees:

| #   | Legal Form | VAT   | Cash | Employees | Required Modules                |
| --- | ---------- | ----- | ---- | --------- | ------------------------------- |
| 1   | Paušalni   | No    | No   | No        | Invoicing, KPR, PO-SD           |
| 2   | Paušalni   | No    | Yes  | No        | + **Fiscalization**             |
| 3   | Paušalni   | Yes\* | No   | No        | + **PDV**                       |
| 4   | Paušalni   | Yes\* | Yes  | No        | + **PDV, Fiscalization**        |
| 5   | Obrt Real  | No    | No   | No        | Invoicing, KPI, URA/IRA, Assets |
| 6   | Obrt Real  | No    | Yes  | No        | + **Fiscalization**             |
| 7   | Obrt Real  | No    | No   | Yes       | + **JOPPD**                     |
| 8   | Obrt Real  | No    | Yes  | Yes       | + **Fiscalization, JOPPD**      |
| 9   | Obrt Real  | Yes   | No   | No        | + **PDV**                       |
| 10  | Obrt Real  | Yes   | Yes  | No        | + **PDV, Fiscalization**        |
| 11  | Obrt Real  | Yes   | No   | Yes       | + **PDV, JOPPD**                |
| 12  | Obrt Real  | Yes   | Yes  | Yes       | + **PDV, Fiscalization, JOPPD** |
| 13  | j.d.o.o.   | Yes   | No   | No        | Invoicing, URA/IRA, Assets, PDV |
| 14  | j.d.o.o.   | Yes   | Yes  | No        | + **Fiscalization**             |
| 15  | j.d.o.o.   | Yes   | No   | Yes       | + **JOPPD**                     |
| 16  | j.d.o.o.   | Yes   | Yes  | Yes       | + **Fiscalization, JOPPD**      |
| 17  | d.o.o.     | Yes   | No   | No        | Invoicing, URA/IRA, Assets, PDV |
| 18  | d.o.o.     | Yes   | Yes  | No        | + **Fiscalization**             |
| 19  | d.o.o.     | Yes   | No   | Yes       | + **JOPPD**                     |
| 20  | d.o.o.     | Yes   | Yes  | Yes       | + **Fiscalization, JOPPD**      |

\*Paušalni with VAT = exceeded 60k threshold

### 4.4 Invoice Requirements by VAT Status

**NOT in VAT system (Paušalni < 60k):**

```
MUST include:
"Porezni obveznik nije u sustavu PDV-a prema čl. 90. st. 2. Zakona o PDV-u"

CANNOT show:
- VAT breakdown
- VAT registration number (HR + OIB)
```

**IN VAT system:**

```
MUST include:
- Seller VAT ID: HR + OIB
- Buyer VAT ID (if B2B)
- VAT breakdown by rate (25%, 13%, 5%, 0%)
- Tax point date
- Sequential invoice number
```

### 4.5 Fiscalization Requirements

**When Required:**

| Payment Method  | Fiscalization?         |
| --------------- | ---------------------- |
| Cash (Gotovina) | YES                    |
| Card (Kartica)  | YES                    |
| Bank Transfer   | NO                     |
| Mixed           | YES (for cash portion) |

**The Flow:**

```
1. Create Invoice
       ↓
2. Calculate ZKI (32-char hex from RSA signature)
       ↓
3. Send to CIS (Tax Authority)
       ↓
4. Receive JIR (36-char UUID)
       ↓
5. Print Invoice with ZKI + JIR + QR Code
```

---

## 11. Tax & Regulatory Data

> **Data Source:** All values in this section are derived from `/src/lib/fiscal-data/`. Changes to tax rates, thresholds, or deadlines should be made in code, then this document updated to match.
>
> **Action Required:** Code update needed - `/src/lib/fiscal-data/data/thresholds.ts` still shows 665.00 EUR for asset capitalization; legal value for 2025 is 1,000.00 EUR.
>
> **Last Verified:** 2025-01-15
> **Verification Schedule:** Monthly review against official sources

### 11.1 Key Thresholds (2025)

| Threshold            | Amount        | Consequence                                   |
| -------------------- | ------------- | --------------------------------------------- |
| VAT Registration     | 60,000 EUR    | Must register for VAT within 8 days           |
| Paušalni Limit       | 60,000 EUR    | Must switch to real income basis              |
| Cash B2B Limit       | 700 EUR       | Fines for both parties if exceeded            |
| Asset Capitalization | 1,000.00 EUR  | Must depreciate over useful life (2025 value) |
| Small Business       | 1,000,000 EUR | Corporate tax 10% vs 18%                      |

_Source: `/src/lib/fiscal-data/data/thresholds.ts`, verified against Porezna Uprava_

### 11.2 Tax Rates

**Income Tax (Porez na dohodak):**

| Bracket        | Rate | With Surtax (~18%) |
| -------------- | ---- | ------------------ |
| 0 - 60,000 EUR | 20%  | ~23.6%             |
| 60,000+ EUR    | 30%  | ~35.4%             |

**Corporate Tax (Porez na dobit):**

| Revenue           | Rate |
| ----------------- | ---- |
| ≤ 1,000,000 EUR   | 10%  |
| > 1,000,000 EUR   | 18%  |

**VAT Rates:**

| Rate | Applies To                      |
| ---- | ------------------------------- |
| 25%  | Most goods and services         |
| 13%  | Hospitality, newspapers         |
| 5%   | Bread, milk, books, medicines   |
| 0%   | Exports, financial services     |

**Paušalni Tax Brackets (2025):**

Base rate: 12% (excluding municipal surtax)

| Tier | Annual Revenue (EUR)  | Tax Base (EUR) | Quarterly Tax (EUR) |
| ---- | --------------------- | -------------- | ------------------- |
| 1    | 0.00 - 11,300.00      | 1,695.00       | 50.85               |
| 2    | 11,300.01 - 15,300.00 | 2,295.00       | 68.85               |
| 3    | 15,300.01 - 19,900.00 | 2,985.00       | 89.55               |
| 4    | 19,900.01 - 30,600.00 | 4,590.00       | 137.70              |
| 5    | 30,600.01 - 40,000.00 | 6,000.00       | 180.00              |
| 6    | 40,000.01 - 50,000.00 | 7,500.00       | 225.00              |
| 7    | 50,000.01 - 60,000.00 | 9,000.00       | 270.00              |

_Source: `/src/lib/fiscal-data/data/tax-rates.ts`, verified against Porezna Uprava_

### 11.3 Contribution Rates (2025)

| Contribution        | Rate      | Minimum Monthly |
| ------------------- | --------- | --------------- |
| MIO I (Pension I)   | 15%       | 107.88 EUR      |
| MIO II (Pension II) | 5%        | 35.96 EUR       |
| HZZO (Health)       | 16.5%     | 118.67 EUR      |
| **Total**           | **36.5%** | **262.51 EUR**  |

Minimum base: 719.2 EUR/month

_Source: `/src/lib/fiscal-data/data/contributions.ts`, verified against Porezna Uprava_

### 11.4 Payment IBANs

| Payment Type | IBAN                  | Model |
| ------------ | --------------------- | ----- |
| State Budget | HR1210010051863000160 | HR68  |
| MIO II       | HR8724070001007120013 | HR68  |
| HZZO         | HR6510010051550100001 | HR68  |
| HOK          | HR1223400091100106237 | HR68  |

_Source: `/src/lib/fiscal-data/data/payment-details.ts`, verified against Porezna Uprava_

### 11.5 Deadlines Calendar

**Monthly:**

| Day  | What                     | Who       |
| ---- | ------------------------ | --------- |
| 15th | Contributions (MIO, HZZO)| All       |
| 15th | JOPPD                    | Employers |
| 20th | PDV (monthly filers)     | VAT > 800k|

**Quarterly:**

| When                     | What              | Who             |
| ------------------------ | ----------------- | --------------- |
| 20.01/04/07/10           | PDV (quarterly)   | Small VAT payers|
| 31.01/04/07/10           | Paušalni tax      | Paušalni obrt   |
| 27.02/31.05/31.08/30.11  | HOK               | All obrts       |

**Annual:**

| When  | What  | Who           |
| ----- | ----- | ------------- |
| 15.01 | PO-SD | Paušalni      |
| 28.02 | DOH   | Obrt dohodak  |
| 30.04 | PDO   | D.O.O.        |

_Source: `/src/lib/fiscal-data/data/deadlines.ts`, verified against Porezna Uprava_
