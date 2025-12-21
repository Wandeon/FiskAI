# Croatian Tax Authority Regulatory Content Discovery Report

## Executive Summary

This report documents all sections on **porezna-uprava.gov.hr** and **porezna.gov.hr** that publish regulatory content suitable for daily monitoring. The analysis identified multiple high-value endpoints for tracking tax interpretations, regulations, fiscalization updates, and technical documentation.

---

## 1. MISLJENJA (TAX AUTHORITY OPINIONS/INTERPRETATIONS)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/misljenja-su/3951
- **Individual Opinion Pattern**: https://porezna-uprava.gov.hr/Misljenja/Detaljno/{ID}
  - Example: /Misljenja/Detaljno/2665

### Content Description

- Official tax interpretations and rulings on specific taxpayer questions
- Covers all tax types (VAT, income tax, corporate tax, property taxes, etc.)
- Legal analysis with specific law citations
- Structured format: Query → Legal Analysis → Conclusion

### Organization

- **Primary Sort**: Reverse chronological (newest first)
- **Filtering Options**:
  - Text search ("Pojam za pretraživanje")
  - Category dropdown (by tax type)
  - Date range filters (Od/Do fields)
- **Volume**: 2,651+ opinions as of December 2025
- **Pagination**: Numbered pages (10 results per page typical)

### Format

- HTML web pages (not PDFs)
- Individual pages contain full opinion text
- Metadata includes:
  - Classification number (e.g., 410-01/25-01/1258)
  - Registration number
  - Publication date
  - Category/tax type
  - Location (Zagreb)

### Update Frequency Indicators

- Opinions published continuously
- Latest visible: December 4, 2025
- Active publication rate based on date spans observed

### Monitoring Recommendation

**HIGH PRIORITY** - Monitor daily for new opinions

- Check page 1 for latest entries
- Filter by specific tax types of interest
- Track classification numbers for versioning

---

## 2. PROPISI (REGULATIONS)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/propisi-3950/3950
- **Alternative**: https://porezna-uprava.gov.hr/Propisi

### Content Description

- Primary source for tax laws and implementing regulations
- Legal framework for all tax types
- Historical versions maintained ("POVIJEST" vs "AKTUALNI")
- Comparison functionality to track regulatory changes

### Organization

- **Structure**: Hierarchical tree-view interface
- **Categories**: By tax type (VAT, income tax, corporate tax, etc.)
- **Version Tracking**: Historical archive alongside current versions
- **Navigation**: Hash-based URLs (e.g., #nodeID|nodeID2)

### Sub-sections Under Regulativa

1. **Propisani obrasci** - Prescribed tax forms
2. **Propisi** - Primary regulations
3. **Mišljenja SU** - Tax authority opinions (see Section 1)
4. **Vodiči** - Compliance guides
5. **Porezna reforma** - Tax reform materials

### Format

- Mix of HTML pages and PDF documents
- Comparison tools built into interface
- Documents show "(Ažurirano DATE)" update stamps

### Update Frequency Indicators

- "Ažurirano" (Updated) date stamps on documents
- Version comparison available
- Historical tracking enabled

### Monitoring Recommendation

**HIGH PRIORITY** - Monitor weekly for regulation updates

- Check for "Ažurirano" date changes
- Use comparison feature to identify modifications
- Cross-reference with Vijesti section for announcements

---

## 3. VIJESTI (NEWS/ANNOUNCEMENTS)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/vijesti/8
- **Pagination Pattern**: ?page={N}
- **Individual Article Pattern**: /hr/{article-slug}/{ID}
  - Example: /hr/nedostupnost-eporezne-i-mporezne-u-ranim-jutarnjim-satima-u-nedjelju-21-prosinca-2025/8213

### Content Description

Four primary content types:

1. **Obavijesti** - Official notices and announcements
2. **Priopćenja** - Press releases and public communications
3. **Servisne informacije** - Service notices (maintenance, outages)
4. General news items

### Topics Covered

- Regulatory updates and changes
- Fiskalizacija system updates
- ePorezna service announcements
- System maintenance windows
- Job postings
- Technical guidance
- Tax procedure updates
- Public procurement notices

### Organization

- **Primary Sort**: Reverse chronological
- **Filtering Options**:
  - By type (Sve vrste, Obavijesti, Priopćenja, Servisne informacije)
  - By topic (Fiskalizacija, ePorezna, Porezi, JOPPD, OIB, etc.)
  - By date range (Od/Do fields)
  - Keyword search
- **Pagination**: Numbered pages with next/previous navigation

### Metadata Available

- Publication date
- Content category/type
- Thematic tags
- Update timestamps ("Ažurirano DATE")

### Format

- HTML articles
- Some with PDF attachments
- Links to related resources

### Update Frequency Indicators

- Very active - multiple updates per week
- Date stamps on all articles
- "Ažurirano" notation for revised articles

### Monitoring Recommendation

**HIGHEST PRIORITY** - Monitor daily

- Check page 1 for latest announcements
- Filter by "Fiskalizacija" topic for technical updates
- Filter by "Obavijesti" for regulatory notices
- Track "Servisne informacije" for system changes

---

## 4. FISKALIZACIJA - TECHNICAL DOCUMENTATION

### 4A. Fiskalizacija 2.0 / eRačun (Electronic Invoices)

#### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/fiskalizacija-2-0-eracun/8073
- **Redirects to**: https://porezna.gov.hr/fiskalizacija/bezgotovinski-racuni

#### Content Description

- Modern fiscalization system for non-cash transactions
- Electronic invoice (eRačun) requirements and specifications
- Information for integrators and service providers
- MIKROeRAČUN application information

#### Available Documentation

- Informational leaflets (PDF):
  - "MIKROeRAČUN - letak"
  - "Fiskalizacija 2.0 - letak"
  - "Usporedba F1 i F2" (Comparison F1 vs F2)
  - "Vodič kroz Fiskalizaciju 2.0" (Guide through Fiskalizacija 2.0)

#### Technical Resources

- Reference to API documentation at porezna.gov.hr/fiskalizacija/api/dokumenti/ (endpoint returned 404)
- Information intermediaries list
- FiskAplikacija (application available as of Dec 9, 2025)

#### Related URLs

- Information intermediaries: /hr/popis-informacijskih-posrednika/8019
- Product classification: /hr/klasifikacija-proizvoda-kpd-2025/7718
- MIKROeRAČUN: /hr/mikroeracun/8190
- FAQ: /hr/pitanja-i-odgovori-vezani-uz-zakon-o-fiskalizaciji-8031/8031

### 4B. Fiskalizacija 1.0 (Cash Fiscalization)

#### Primary Endpoint

- **URL**: https://porezna.gov.hr/fiskalizacija/gotovinski-racuni

#### Content Description

- Cash transaction fiscalization system
- Requirements for fiscal cash registers
- Technical specifications for developers

#### Available Technical Documentation

- **Technical Specification for Users v2.6** (published June 30, 2025)
- **WSDL version 1.8** (changes effective September 1, 2025)
- **WSDL version 1.9** (changes effective January 1, 2026)
- User guides for business premises registration (version 2.4)
- "Fiskalizacija 1.0" informational flyer

#### Test & Production Environments

- **Test Environment**: Available since July 24, 2025 for testing changes
- **Production Server**: cis.porezna-uprava.hr
- **Server Certificate**: Expires January 2026 (monitor for renewal)

#### Related URLs

- Receipt verification: /hr/provjeri-fiskalni-racun/3968
  - Redirects to: https://porezna.gov.hr/fiskalizacija/gotovinski-racuni/provjeri-fiskalni-racun
- Q&A: /hr/pitanja-i-odgovori-vezani-uz-zakon-o-fiskalizaciji-8031/8031
- Reporting system: porezna.gov.hr/fiskalizacija/izvjestaji/ (internal domain)

#### Format

- Technical specs: Downloadable documents
- WSDL/XSD schemas: Referenced but direct download URLs not visible
- Guides: PDF format

### Update Frequency Indicators

- Version numbers tracked (v2.5 → v2.6)
- WSDL versions with effective dates
- Test environment updates announced with advance notice
- Certificate expiration dates provided

### Monitoring Recommendation

**HIGHEST PRIORITY** - Monitor weekly for technical updates

- Track version numbers of technical specifications
- Monitor WSDL version releases
- Watch for test environment announcements
- Track certificate expiration dates
- Check for new Q&A entries

---

## 5. PITANJA I ODGOVORI (FAQ/Q&A)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/pitanja-i-odgovori-vezani-uz-zakon-o-fiskalizaciji-8031/8031
- **Category Pattern**: /hr/{category-slug}/{ID}/{ID}

### Content Description

Frequently asked questions organized by category:

1. "Općenito" (General)
2. "Fiskalizacija računa u krajnjoj potrošnji - B2C poslovanje" (B2C invoicing)
3. "Izdavanje i primanje eRačuna i fiskalizacija eRačuna" (eInvoice issuance/receipt)
4. "Pitanja vezana uz propise o PDV-u" (VAT regulation questions)

### Organization

- Categorized by topic
- Search functionality available
- Organized as Q&A pairs

### Format

- HTML web pages
- Embedded in main site structure

### Update Frequency Indicators

- Explicit statement: "Pitanja i odgovori će se kontinuirano nadopunjavati i ažurirati!" (Q&A will be continuously supplemented and updated)
- Date stamps shown: "Ažurirano 4.12.2025"
- Active maintenance indicated

### Monitoring Recommendation

**MEDIUM PRIORITY** - Monitor bi-weekly

- Check for "Ažurirano" date changes
- Review new questions added to categories
- Track updates to VAT-related questions

---

## 6. PROPISANI OBRASCI (PRESCRIBED FORMS)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/propisani-obrasci/3955

### Content Description

Official tax forms for all tax types:

- Income tax forms (Porez na dohodak)
- Corporate tax forms (Porez na dobit)
- VAT forms (Porez na dodanu vrijednost)
- Real estate transfer tax forms
- Games of chance forms
- Contribution forms
- Personal ID number (OIB) forms

### Organization

- Hierarchical by tax type
- Filterable interface
- Year-based versioning (e.g., "PO-SD za 2024")

### Format

- **Primary Format**: PDF documents
- **URL Pattern**:
  ```
  https://porezna-uprava.gov.hr/UserDocsImages/Arhiva/HR_obrasci/Documents/{CATEGORY}/{FORM_NAME}.pdf
  ```
- **Categories**: ARHIVA OBRAZACA/POREZ NA DOHODAK, DOPRINOSI, OSTALO, etc.

### Electronic Forms

- Electronic versions available through ePorezna portal (login required)
- Requires NIAS authentication

### Update Frequency Indicators

- Year-based versioning
- Forms updated annually or as regulations change
- No specific update dates visible

### Monitoring Recommendation

**MEDIUM PRIORITY** - Monitor quarterly

- Check for new form versions
- Track year-based updates (especially Q4 and Q1)
- Monitor for new form types

---

## 7. VODIČI (GUIDANCE DOCUMENTS)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/vodici-za-ispunjavanje-poreznih-prava-i-obveza/3953

### Content Description

Compliance guides organized by taxpayer type and topic:

- Real estate taxation guidance
- Craft businesses (flat-rate systems)
- Tips/gratuities taxation
- Seasonal agricultural work
- Tourism rental income
- Student obligations
- OIB procedures

### Special Technical Guide

- "Vodič kroz Fiskalizaciju 2.0" - Technical implementation guide for integrators

### Organization

- Hierarchical by taxpayer category
- Topic-based navigation
- Integrated with electronic services

### Format

- Web pages with embedded content
- PDF downloads for some guides
- Links to ePorezna portal services

### Update Frequency Indicators

- "Ažurirano DATE" stamps on some guides
- Generally less frequent updates than news/opinions
- Updated when regulations change

### Monitoring Recommendation

**LOW PRIORITY** - Monitor monthly

- Check for new guides
- Track "Ažurirano" date changes
- Focus on technical implementation guides

---

## 8. INFORMACIJSKI POSREDNICI (INFORMATION INTERMEDIARIES)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/popis-informacijskih-posrednika/8019

### Content Description

List of certified software vendors and service providers for:

- eRačun/fiskalizacija (electronic invoicing/fiscalization)
- eIzvještavanje (electronic reporting)
- MPS (merchant payment services)

### Information Provided

- Company name and tax ID (OIB)
- Service offerings (checkmarks for each service type)
- Currently 33 certified intermediaries
- Croatian and international providers (Polish, Spanish, Finnish, German, Icelandic)

### Organization

- Table format with 5 columns
- No direct vendor links or documentation
- Service capability indicators

### Update Frequency Indicators

- Explicit statement: "Popis informacijskih posrednika kontinuirano se nadopunjava i ažurira" (list continuously supplemented and updated)
- Last update: December 17, 2025
- Active maintenance

### Monitoring Recommendation

**LOW PRIORITY** - Monitor monthly

- Track new intermediary additions
- Note service capability changes
- Useful for ecosystem monitoring

---

## 9. KLASIFIKACIJA PROIZVODA (PRODUCT CLASSIFICATION KPD 2025)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/klasifikacija-proizvoda-kpd-2025/7718

### Content Description

- Product classification codes required for e-Invoices
- Minimum 6-digit codes required
- Aligned with EU's CPA 2.2 statistical standard
- Organized by economic sectors

### External Resources

- **KLASUS application** hosted by State Bureau of Statistics
- Search interface for classification codes
- Visual guides for downloading catalog

### Organization

- By economic sector (e.g., Section C - manufacturing, Section G - retail)
- Hierarchical browsing by business activity (NKD code)
- Product-level classification

### Format

- Web-based search application (external)
- Visual guides (on tax authority site)
- No direct XLS/PDF/XML downloads visible
- Reference to "fiskalizacijski set podataka" (fiscal dataset)

### Support

- Questions to State Bureau of Statistics: KPD@dzs.hr

### Monitoring Recommendation

**LOW PRIORITY** - Monitor quarterly

- Check for classification updates
- Track guidance document changes
- Important for invoice validation systems

---

## 10. MIKROeRAČUN SERVICE

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/mikroeracun/8190

### Content Description

- Free Tax Administration application for e-invoices
- Target users: Non-VAT registered entities and non-public procurement organizations

### Current Capabilities (2025-2026)

- Receiving e-invoices
- Fiscalizing received invoices
- Reviewing invoice details
- Rejecting e-invoices
- Document storage and archiving
- Search functionality

### Upcoming Features

- **January 1, 2027**: E-invoice issuance capability added

### Documentation

- General Terms of Use (linked document)
- User Instructions (linked document)
- Information leaflet

### Access

- Through ePorezna portal
- Web browser based (no digital certificates required)
- Support via "Contact Us" under Fiscalization e-invoices category

### Important Constraints

- Users lose access upon VAT registration
- Must migrate to commercial providers if VAT obligation opens

### Monitoring Recommendation

**LOW PRIORITY** - Monitor semi-annually

- Track feature rollout (especially Jan 1, 2027 update)
- Monitor Terms of Use changes
- Check for new user documentation

---

## 11. TAX-SPECIFIC SECTIONS

### 11A. VAT (PDV)

#### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/pdv-3938/3938

#### Key Subsections

- Solar panels zero rate: /hr/solarne-ploce-nulta-stopa-pdva/4802
- VAT fraud prevention: /hr/pdv-prijevare/3987
- Foreign VAT ID validation: /hr/provjera-valjanosti-stranih-pdv-id-brojeva-4000/4000
- EU VAT refund: /hr/sustav-povrata-pdv-a-iz-eu-vat-refund/7409
- OSS special procedure: /hr/posebni-postupak-oporezivanja-pdv-a-oss/7412
- CESOP: /hr/cesop/7414
- Documents: /hr/dokumenti-4295/4295
- FAQ: /hr/najcesce-p-ostavljena-pitanja/4348

#### Content Types

- Legislation (VAT Law and Regulations)
- EU directives implementation
- Court decisions
- Practical guides and leaflets
- Tax rates and exemptions

### 11B. Income Tax (Porez na dohodak)

#### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/porez-na-dohodak-3939/3939

#### Key Subsections

- JOPPD: /hr/joppd/3956
- Annual settlement: /hr/godisnji-obracun-poreza-na-dohodak/3957
- Foreign income: /hr/inozemni-dohodak-ino-doh/3960
- Voluntary disclosure: /hr/dobrovoljna-prijava-inozemnih-primitaka/3961

#### Organization Focus

- Taxpayer definitions (residents vs. non-residents)
- Income source classification (5 categories)
- Tax base calculations
- Rate structures

### 11C. Corporate Tax (Porez na dobit)

#### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/porez-na-dobit-3940/3940

#### Special Topics

- Transfer pricing: /hr/transferne-cijene/3993

### Monitoring Recommendation for Tax Sections

**MEDIUM PRIORITY** - Monitor monthly

- Track FAQ updates
- Monitor new subsection creation
- Check for rate changes
- Review new guidance documents

---

## 12. PLANOVI RADA I IZVJEŠTAJI (WORK PLANS & REPORTS)

### Primary Endpoint

- **URL**: https://porezna-uprava.gov.hr/hr/planovi-rada-i-izvjestaji/4013

### Content Description

Two primary document types:

1. **Annual Work Plans** - Strategic operational plans
2. **Annual Reports** - Management review documents

### Available Years

- 2020, 2021, 2022, 2023, 2024, 2025, 2026

### Format

- **PDF files** for narrative reports
- **Excel spreadsheets** for performance tables and metrics
- **Structured tables** tracking planned vs. achieved objectives

### Update Frequency

- Annual publication cycle
- One plan and report per calendar year
- Published in advance (2026 plan already available)

### Monitoring Recommendation

**LOW PRIORITY** - Monitor annually

- Check for new annual plans (typically Q4)
- Review annual reports (typically Q2 following year)
- Useful for strategic understanding of tax authority priorities

---

## 13. ADDITIONAL ENDPOINTS OF INTEREST

### 13A. Electronic Services

- **URL**: https://porezna-uprava.gov.hr/hr/elektronicke-usluge/3964
- **Content**: Overview of ePorezna, mPorezna, eGrađani
- **Technical Notes**: NIAS authentication requirements, Services Catalog PDF
- **Monitoring**: Low priority - infrastructure rarely changes

### 13B. Registries and Databases

- **URL**: https://porezna-uprava.gov.hr/hr/registri-i-baze-podataka/3989
- **Content**: OIB Registry, Tax Payers Registry (RPO)
- **Access**: Not publicly accessible (tax secrecy)
- **Open Data Portal**: https://data.gov.hr/
- **Monitoring**: Not applicable for monitoring

### 13C. Receipt Verification

- **URL**: https://porezna.gov.hr/fiskalizacija/gotovinski-racuni/provjeri-fiskalni-racun
- **Content**: Public verification tool for fiscal receipts
- **Methods**: QR code scanning, manual entry (JIR/ZKI/ISU)
- **Monitoring**: Not applicable - end-user tool

### 13D. Media Section

- **URL**: https://porezna-uprava.gov.hr/hr/mediji/4067
- **Content**: Contact information for media inquiries
- **Note**: Not a press release archive
- **Monitoring**: Not applicable

---

## MONITORING PRIORITY MATRIX

### Daily Monitoring (Highest Priority)

1. **Vijesti (News)** - /hr/vijesti/8
   - Filter by: Fiskalizacija, Obavijesti, Servisne informacije
   - Check page 1 for latest announcements

2. **Mišljenja (Opinions)** - /hr/misljenja-su/3951
   - Check page 1 for new interpretations
   - Filter by relevant tax types

### Weekly Monitoring (High Priority)

3. **Fiskalizacija Technical Docs** - porezna.gov.hr/fiskalizacija/gotovinski-racuni
   - Track version updates (WSDL, Technical Specifications)
   - Monitor test environment announcements
   - Check certificate expiration dates

4. **Propisi (Regulations)** - /hr/propisi-3950/3950
   - Check for "Ažurirano" date changes
   - Review comparison tools for modifications

### Bi-Weekly Monitoring (Medium Priority)

5. **FAQ/Q&A** - /hr/pitanja-i-odgovori-vezani-uz-zakon-o-fiskalizacija-8031/8031
   - Track "Ažurirano" date stamps
   - Review new questions added

### Monthly Monitoring (Medium Priority)

6. **Tax-Specific Sections** (VAT, Income Tax, Corporate Tax)
   - Check FAQ updates
   - Monitor new guidance documents

7. **Informacijski Posrednici** - /hr/popis-informacijskih-posrednika/8019
   - Track new vendor certifications

8. **Vodiči (Guides)** - /hr/vodici-za-ispunjavanje-poreznih-prava-i-obveza/3953
   - Check for new technical guides

### Quarterly Monitoring (Low Priority)

9. **Propisani Obrasci (Forms)** - /hr/propisani-obrasci/3955
   - Check for new form versions (especially Q4/Q1)

10. **Klasifikacija Proizvoda** - /hr/klasifikacija-proizvoda-kpd-2025/7718
    - Monitor classification updates

### Semi-Annual Monitoring (Low Priority)

11. **MIKROeRAČUN** - /hr/mikroeracun/8190
    - Track feature rollouts
    - Monitor major updates (e.g., Jan 1, 2027 issuance feature)

### Annual Monitoring (Low Priority)

12. **Planovi Rada i Izvještaji** - /hr/planovi-rada-i-izvjestaji/4013
    - Review annual plans (Q4)
    - Review annual reports (Q2)

---

## TECHNICAL INTEGRATION NOTES

### No RSS Feeds Discovered

- Tested https://porezna-uprava.gov.hr/rss - returns HTML homepage, not RSS feed
- No visible RSS feed links in page headers or footers
- Monitoring must be done via scraping HTML endpoints

### No Public APIs Discovered

- Reference to porezna.gov.hr/fiskalizacija/api/dokumenti/ returns 404
- WSDL files mentioned but download URLs not directly accessible
- ePorezna requires authentication (NIAS)

### URL Patterns for Scraping

#### Opinions (Mišljenja)

- List: `/hr/misljenja-su/3951?page={N}`
- Individual: `/Misljenja/Detaljno/{ID}`
- Filters: POST parameters or JavaScript-based

#### News (Vijesti)

- List: `/hr/vijesti/8?page={N}`
- Individual: `/hr/{slug}/{ID}`
- Filters: POST parameters or JavaScript-based

#### Regulations (Propisi)

- Main: `/hr/propisi-3950/3950`
- Navigation: Hash-based (#nodeID|nodeID2)
- Requires JavaScript rendering

### Scraping Considerations

1. **Rate Limiting**: Use 2-second delays between requests (as practiced in this scan)
2. **JavaScript Requirements**: Some sections use tree-view interfaces requiring JS rendering
3. **Authentication**: ePorezna services require NIAS login
4. **Pagination**: Check for page parameters and total result counts
5. **Filtering**: May require POST requests or JavaScript interaction
6. **Date Formats**: Croatian date format (DD.MM.YYYY)

### Document Download Patterns

- **Forms**: `/UserDocsImages/Arhiva/HR_obrasci/Documents/{CATEGORY}/{FORM_NAME}.pdf`
- **General Docs**: Various patterns, often embedded in content pages
- **No centralized document repository** accessible

---

## METADATA FOR MONITORING SYSTEM

### Critical Update Indicators

1. **"Ažurirano" followed by date** - Primary update indicator
2. **Publication dates** on news and opinions
3. **Version numbers** on technical specifications (e.g., v2.6)
4. **WSDL versions** with effective dates
5. **"Kontinuirano se nadopunjava i ažurira"** - Indicates active maintenance

### Content Type Classification

- **Regulatory**: Propisi, Mišljenja
- **Technical**: Fiskalizacija docs, WSDL, Technical Specifications
- **Informational**: Vijesti, Obavijesti, Vodiči
- **Operational**: Servisne informacije, maintenance notices
- **Administrative**: Forms, intermediaries list

### Language

- **Primary Language**: Croatian (Hrvatski)
- **No English version** of site observed
- Translation required for non-Croatian speakers

---

## RECOMMENDED MONITORING WORKFLOW

### Daily Scrape (Morning)

1. Fetch Vijesti page 1
   - Extract latest 10-20 items
   - Filter for: Fiskalizacija, Obavijesti, Servisne informacije
   - Compare against previous day's data
   - Alert on: New items, "Ažurirano" date changes

2. Fetch Mišljenja page 1
   - Extract latest 10 opinions
   - Compare against previous day's data
   - Alert on: New opinions with IDs

### Weekly Scrape (Monday)

3. Fetch Fiskalizacija gotovinski-racuni page
   - Look for version number changes
   - Check for "ažurirano" updates
   - Monitor certificate expiration warnings

4. Scan Propisi section
   - Check modification dates
   - Look for "Aktualni" regulation updates

### Monthly Scrape (1st of month)

5. Full scan of all endpoints
   - Comprehensive comparison
   - Archive snapshot for historical tracking
   - Verify all monitoring endpoints still accessible

### Alert Conditions

- **Critical**: New WSDL versions, technical specification updates, regulation changes
- **High**: New tax authority opinions, fiscalization announcements
- **Medium**: New FAQ entries, form updates, vendor list changes
- **Low**: General news items, service notices

---

## LIMITATIONS & GAPS

### No Technical API Documentation Found

- WSDL files mentioned but not directly downloadable
- XSD schemas not publicly accessible
- Test environment details limited
- Certificate downloads not visible

### No Structured Data Feeds

- No RSS/Atom feeds
- No JSON APIs
- No XML exports
- Scraping HTML required

### Authentication Barriers

- ePorezna services require NIAS login
- Electronic forms require authentication
- Some technical resources may be behind login

### Dynamic Content Challenges

- Tree-view navigation (JavaScript-dependent)
- Filter forms may use POST or AJAX
- Pagination patterns vary by section

### Missing Information

- Direct links to downloadable WSDL/XSD files
- API endpoint documentation
- Webhook or notification services
- Change logs or version histories

---

## CONCLUSION

The Croatian Tax Authority maintains two primary domains with complementary content:

1. **porezna-uprava.gov.hr** - Main regulatory and administrative site
   - Opinions, regulations, forms, guides
   - News and announcements
   - Most comprehensive content

2. **porezna.gov.hr** - Specialized fiscalization portal
   - Technical specifications for cash and electronic fiscalization
   - Receipt verification
   - Focused on B2C and B2B invoicing systems

**Total High-Value Endpoints Identified**: 12 primary sections + numerous subsections

**Most Critical for Daily Monitoring**:

- Vijesti (News) - for announcements and regulatory updates
- Mišljenja (Opinions) - for tax interpretations
- Fiskalizacija technical docs - for integrator specifications

**Key Finding**: No RSS feeds or APIs available; monitoring requires HTML scraping with 2-second rate limiting.

**Recommended Architecture**:

- Daily scrapers for Vijesti and Mišljenja
- Weekly scrapers for technical documentation
- Monthly comprehensive scans
- Content change detection with diff comparison
- Alert system based on priority matrix

---

**Report Generated**: 2025-12-21
**Scan Coverage**: Both porezna-uprava.gov.hr and porezna.gov.hr domains
**Total Requests Made**: 30+ (with 2-second delays)
**Analysis Depth**: Navigation structure, content organization, URL patterns, update indicators
