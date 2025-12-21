# Croatian Regulatory Truth Layer

## Extended thesis with verified “hard truth” access points (Dec 2025)

This document extends the v2 concept with **verified, official access points** and concrete “what’s reliable vs what isn’t” guidance for data ingestion in Croatia.

You are not building “a scraper.”  
You are building a **Regulatory CI/CD pipeline** that ingests official publications, stores immutable evidence, detects change, and publishes versioned, explainable truth.

---

## 1) The hard truth, backed by official statements and structures

### 1.1 There is no single canonical, machine-readable “truth API” for running a business in Croatia

Instead, the authoritative picture is split across institutions:

- **Narodne novine** (binding law text)
- **Porezna uprava** (interpretations, guidance, fiscalization technical docs)
- **FINA** (eRačun procedures and technical specs)
- **HZMO/HZZO** (pension and health insurance procedures, notices, employer-facing updates)

Your advantage is not “having data.”  
Your advantage is building the **synthesized, time-aware, conflict-aware truth layer** from these official fragments.

---

## 2) Official access points, what they explicitly promise, and how reliable they are

### 2.1 Narodne novine (binding law publication)

**Verified official access point:** The Narodne novine portal provides a “Data access” page stating online data access is available using standard Internet protocols, anonymously and free of charge.  
Source: https://narodne-novine.nn.hr/data_access.aspx

**Verified machine-discovery mechanism:** Narodne novine exposes a sitemap index listing many sitemap files.  
Source: https://narodne-novine.nn.hr/sitemap.xml

**Hard truth**

- This is the strongest anchor you have because it is the legally binding publication channel.
- It is authoritative but raw: not consolidated, not graph-structured, not optimized for automation.

**Ingestion guidance**

- Use **sitemap-driven discovery** to enumerate URLs.
- Snapshot HTML/PDF, hash, store append-only, then diff by hash and semantic signals.
- Build SourcePointers that cite exact article/paragraph/page spans.

**Reliability rating**

- Authority: maximal (LAW)
- Machine access: good (sitemaps + stable pages)
- Consolidation: poor (you must build it)

---

### 2.2 Porezna uprava (interpretation + enforcement reality)

#### a) Mišljenja SU listings (interpretation layer)

The Porezna uprava mišljenja pages contain an explicit warning that older opinions may no longer be applicable if underlying laws/regulations changed, and that changes must be checked.  
Source: https://porezna-uprava.gov.hr/hr/misljenja-su/3951  
(Alternate listing: https://www.porezna-uprava.hr/HR_publikacije/Stranice/lista-misljenja.aspx)

**Hard truth**

- These are not law, but they strongly influence real-world enforcement and inspection practice.
- The site itself warns about time validity and changes over years, validating your time-aware model.

**Ingestion guidance**

- Treat mišljenja as **GUIDANCE** authority level.
- Always store the exact snapshot and link it to the Narodne novine laws referenced inside the opinion.
- Model staleness and conflict as first-class states.

#### b) Fiskalizacija technical docs and “Tehnički podaci” (operational requirements)

Porezna hosts official fiscalization technical docs (versions, WSDL/schema references, dated updates) under “Tehnički podaci.”  
Source: https://porezna.gov.hr/fiskalizacija/gotovinski-racuni/tehnicki-podaci/o/tehnicki-podaci

They also publish **Fiskalizacija 2.0** technical specifications for cashless invoices/eRačun workflows as part of the NPOO project.  
Source: https://porezna.gov.hr/fiskalizacija/bezgotovinski-racuni/bezgotovinski-racuni-novosti/o/tehnicke-specifikacije

Example official announcement including effective dates and multiple schema versions:  
Source: https://porezna-uprava.gov.hr/hr/fiskalizacija-nova-verzija-tehnicke-specifikacije-za-korisnike-v2-6/7756

**Hard truth**

- Porezna provides a usable “this is the technical spec” channel (PDFs, WSDL versions, effective dates).
- Specs change and include scheduled future effective dates (time-scope them).

**Ingestion guidance**

- Treat technical specs as **PROCEDURE** authority level.
- Store each version, capture effective-from dates, and link to rules impacting integrators and end users.
- Create structured “procedure rules” that drive checklists and integration validation.

**Reliability rating**

- Authority: high for enforcement/procedure
- Machine access: good (stable pages + PDFs)
- Deprecation tracking: weak (you implement it)

---

### 2.3 FINA (eRačun procedures and technical specs)

FINA publishes “Documents for Fina e-Račun” pages that include conditions/terms and certificate documentation.  
Source: https://www.fina.hr/digitalizacija-poslovanja/e-racun/dokumenti-za-fina-e-racun

FINA publishes technical specifications describing integration via web services and security aspects:  
Source: https://www.fina.hr/digitalizacija-poslovanja/e-racun/tehnicka-specifikacija/tehnicka-specifikacija-slanje-racuna-web-servisom

FINA maintains integration guides (including demo environment references) and notes specs exist in Croatian and English.  
Source: https://www.fina.hr/digitalizacija-poslovanja/e-racun/vodici-za-integraciju-racunovodstvenog-programa-sa-servisom-fina-e-racun/integracija-racunovodstvenog-programa-s-fina-e-racunom-i-testiranje-na-demookolini

FINA publishes updates tied to Fiskalizacija 2.0 production availability (example notice, Dec 2025).  
Source: https://www.fina.hr/obavijesti/fina-e-racun/azurirane-tehnicke-specifikacije-na-servisu-fina-e-racun-i-e-racun-za-drzavu

**Hard truth**

- For eRačun, FINA is the procedure authority: to make it work, you follow their technical rules.
- Versioning is not enforced for you. You must enforce it via Evidence + Releases.

**Ingestion guidance**

- Treat as **PROCEDURE** authority level.
- Monitor key technical pages and update notices.
- Snapshot everything and extract exact pointers (page spans, section headings).

**Reliability rating**

- Authority: high for integration/procedures
- Machine access: good
- Versioning: you must enforce it

---

### 2.4 HZZO and HZMO (official notices and scoped procedures)

HZZO publishes “Novosti” and “Obavijesti” sections that can be monitored as official update streams.  
Sources:

- https://hzzo.hr/novosti
- https://hzzo.hr/obavijesti
- Employer-facing portal updates: https://hzzo.hr/e-zdravstveno/novosti

HZMO publishes official “Vijesti” and “Priopćenja” sections on its portal (mirovinsko.hr).  
Sources:

- https://www.mirovinsko.hr/114 (Vijesti)
- https://www.mirovinsko.hr/204 (Priopćenja)
- Example announcement page: https://www.mirovinsko.hr/hr/u-petak-19-prosinca-pocinje-isplata-godisnjeg-dodatka-svim-korisnicima-mirovine-4309/4309

**Hard truth**

- These are reliable official channels within their scope.
- They are not consolidated rulebooks and are not optimized for machine reading.

**Ingestion guidance**

- Treat as **PROCEDURE** or institutional notice inputs.
- Monitor listing pages daily; snapshot items; classify changes that affect employers/obligations/deadlines.

---

### 2.5 data.gov.hr (Open Data portal) is discovery, not legal authority

Example: CKAN dataset entry referencing Porezna mišljenja SU.  
Source: https://data.gov.hr/ckan/hr/dataset/https-porezna-uprava-gov-hr-hr-misljenja-su-3951

Portal home: https://data.gov.hr/

**Hard truth**

- Use it for discovery and metadata.
- Always ingest canonical documents from the issuing institution.

---

## 3) What “hit and miss” means in practice

### 3.1 Reliability comes from a discovery ladder (not blind crawling)

Use a 3-tier discovery strategy:

1. RSS/feeds when present
2. Sitemaps or stable listings (often present and robust)
3. Targeted crawling only for critical sections you already know matter

Narodne novine’s sitemap is a concrete tier-2 example that reduces miss rate.

### 3.2 The true failure modes are governance failures, not scraping failures

Most systems fail because they:

- don’t store immutable snapshots
- don’t detect semantic changes
- don’t version releases
- answer without precise citations
- flatten conflicts instead of modeling them

Your system avoids this by design.

---

## 4) “Single source of truth” redefined

You will not create a single perfect truth.
You will create a **single operational truth layer** that is:

- evidence-backed (immutable snapshots + pointers)
- time-aware (valid from/until, time travel)
- conflict-aware (LAW vs GUIDANCE vs PROCEDURE)
- governed (review gates + releases)
- safe for automation (confidence + risk + refusal rules)

That is the only “single source” that can exist in Croatia.

---

## 5) Minimal ingestion blueprint (what to implement first)

### Phase 1 (must exist before AI)

- Evidence store (append-only, hashed, raw artifacts)
- SourcePointer creation (PDF page spans, HTML selectors, article refs)
- Reviewer UI: inbox + conflict + release
- Release mechanism (versioned truth bundle)

### Phase 2 (daily operational loop)

- Discovery jobs per institution (sitemap/listing/doc pages)
- Diff + change classification
- Impact mapping via graph edges
- Draft rule synthesis
- Human review gate
- Regression tests
- Publish release

### Phase 3 (assistive AI only)

- RAG for explanations
- Never generate “truth” without rule + pointers

---

## 6) References (official access points used)

- Narodne novine data access: https://narodne-novine.nn.hr/data_access.aspx
- Narodne novine sitemap: https://narodne-novine.nn.hr/sitemap.xml
- Porezna mišljenja SU warning: https://porezna-uprava.gov.hr/hr/misljenja-su/3951
- Porezna technical data (fiscalization): https://porezna.gov.hr/fiskalizacija/gotovinski-racuni/tehnicki-podaci/o/tehnicki-podaci
- Porezna Fiskalizacija 2.0 technical specs: https://porezna.gov.hr/fiskalizacija/bezgotovinski-racuni/bezgotovinski-racuni-novosti/o/tehnicke-specifikacije
- Porezna announcement with effective dates + schema versions: https://porezna-uprava.gov.hr/hr/fiskalizacija-nova-verzija-tehnicke-specifikacije-za-korisnike-v2-6/7756
- FINA e-Račun documents: https://www.fina.hr/digitalizacija-poslovanja/e-racun/dokumenti-za-fina-e-racun
- FINA e-Račun web service spec: https://www.fina.hr/digitalizacija-poslovanja/e-racun/tehnicka-specifikacija/tehnicka-specifikacija-slanje-racuna-web-servisom
- FINA integration guide + demo testing: https://www.fina.hr/digitalizacija-poslovanja/e-racun/vodici-za-integraciju-racunovodstvenog-programa-sa-servisom-fina-e-racun/integracija-racunovodstvenog-programa-s-fina-e-racunom-i-testiranje-na-demookolini
- FINA updated specs notice (Dec 2025): https://www.fina.hr/obavijesti/fina-e-racun/azurirane-tehnicke-specifikacije-na-servisu-fina-e-racun-i-e-racun-za-drzavu
- HZZO Novosti: https://hzzo.hr/novosti
- HZZO Obavijesti: https://hzzo.hr/obavijesti
- HZZO employer-facing updates: https://hzzo.hr/e-zdravstveno/novosti
- HZMO Vijesti: https://www.mirovinsko.hr/114
- HZMO Priopćenja: https://www.mirovinsko.hr/204
- Open Data CKAN dataset referencing Porezna mišljenja: https://data.gov.hr/ckan/hr/dataset/https-porezna-uprava-gov-hr-hr-misljenja-su-3951
- Open Data portal: https://data.gov.hr/
