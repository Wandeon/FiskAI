-- Croatian Regulatory Truth Layer - Endpoint Seed Data
-- Generated: 2025-12-21
-- Based on comprehensive discovery scans of all 6 primary sources

-- ============================================================================
-- TIER 1: CRITICAL (Check every run)
-- ============================================================================

-- Narodne novine - Official Gazette (Sitemap-based)
INSERT INTO "DiscoveryEndpoint" (id, domain, path, name, "endpointType", priority, "scrapeFrequency", "listingStrategy", "urlPattern", "paginationPattern", "isActive", metadata)
VALUES
  ('ep-nn-sitemap', 'narodne-novine.nn.hr', '/sitemap.xml', 'Narodne novine - Main Sitemap', 'SITEMAP_INDEX', 'CRITICAL', 'EVERY_RUN', 'SITEMAP_XML', 'sitemap_(\d)_(\d{4})_(\d+)\.xml', NULL, true, '{"types": {"1": "sluzbeni", "2": "medunarodni", "3": "oglasni"}}'),

-- HZZO - Croatian Health Insurance Fund
  ('ep-hzzo-novosti', 'hzzo.hr', '/novosti', 'HZZO - Novosti', 'NEWS_LISTING', 'CRITICAL', 'EVERY_RUN', 'PAGINATION', '/novosti/[\\w-]+', '?page={N}', true, '{"categories": ["DZO", "HZZO", "Ostalo"]}'),
  ('ep-hzzo-pravni-akti', 'hzzo.hr', '/pravni-akti', 'HZZO - Pravni akti', 'LEGAL_ACTS', 'CRITICAL', 'EVERY_RUN', 'HTML_LIST', NULL, NULL, true, '{"includes": ["zakoni", "pravilnici", "odluke", "eu-uredbe"]}'),
  ('ep-hzzo-savjetovanja', 'hzzo.hr', '/pravo-na-pristup-informacijama/savjetovanje-s-javnoscu-u-postupku-donosenja-opcih-akata', 'HZZO - Savjetovanja', 'CONSULTATIONS', 'CRITICAL', 'EVERY_RUN', 'HTML_LIST', NULL, NULL, true, '{"feedbackEmail": "zainteresirana.javnost@hzzo.hr"}'),

-- HZMO - Croatian Pension Insurance Institute
  ('ep-hzmo-vijesti', 'mirovinsko.hr', '/hr/vijesti/114', 'HZMO - Vijesti', 'NEWS_LISTING', 'CRITICAL', 'EVERY_RUN', 'PAGINATION', '/hr/[\\w-]+/\\d+', '?page={N}', true, '{"dateFormat": "DD.MM.YYYY"}'),
  ('ep-hzmo-priopcenja', 'mirovinsko.hr', '/hr/priopcenja-204/204', 'HZMO - Priopćenja', 'NEWS_LISTING', 'CRITICAL', 'EVERY_RUN', 'PAGINATION', '/hr/[\\w-]+/\\d+', '?page={N}', true, '{"contains": ["payment_dates", "announcements"]}'),
  ('ep-hzmo-propisi', 'mirovinsko.hr', '/hr/propisi/54', 'HZMO - Propisi', 'LEGAL_ACTS', 'CRITICAL', 'EVERY_RUN', 'HTML_LIST', NULL, NULL, true, '{"categories": 8}'),

-- Porezna uprava - Tax Administration
  ('ep-porezna-vijesti', 'porezna-uprava.gov.hr', '/hr/vijesti/8', 'Porezna uprava - Vijesti', 'NEWS_LISTING', 'CRITICAL', 'EVERY_RUN', 'PAGINATION', '/hr/[\\w-]+/\\d+', '?page={N}', true, '{"filterTypes": ["Obavijesti", "Priopćenja", "Servisne informacije"]}'),
  ('ep-porezna-misljenja', 'porezna-uprava.gov.hr', '/hr/misljenja-su/3951', 'Porezna uprava - Mišljenja SU', 'NEWS_LISTING', 'CRITICAL', 'EVERY_RUN', 'PAGINATION', '/Misljenja/Detaljno/\\d+', '?page={N}', true, '{"totalOpinions": 2651}'),

-- FINA - Financial Agency
  ('ep-fina-eracun', 'fina.hr', '/obavijesti/fina-e-racun', 'FINA - e-Račun obavijesti', 'ANNOUNCEMENTS', 'CRITICAL', 'EVERY_RUN', 'PAGINATION', '/obavijesti/[\\w-]+', '?page={N}', true, '{"contains": ["technical_specs", "eu_validator"]}'),
  ('ep-fina-novosti', 'fina.hr', '/novosti', 'FINA - Novosti', 'NEWS_LISTING', 'CRITICAL', 'EVERY_RUN', 'PAGINATION', '/novosti/[\\w-]+', '?page={N}', true, '{"totalPages": 116}'),

-- Ministry of Finance
  ('ep-mfin-vijesti', 'mfin.gov.hr', '/vijesti/8', 'Ministarstvo financija - Vijesti', 'NEWS_LISTING', 'CRITICAL', 'EVERY_RUN', 'PAGINATION', '/vijesti/[\\w-]+/\\d+', '?page={N}', true, '{"totalItems": 1881}');

-- ============================================================================
-- TIER 2: HIGH PRIORITY (Check daily)
-- ============================================================================

INSERT INTO "DiscoveryEndpoint" (id, domain, path, name, "endpointType", priority, "scrapeFrequency", "listingStrategy", "urlPattern", "paginationPattern", "isActive", metadata)
VALUES
-- HZZO
  ('ep-hzzo-ezdravstveno-novosti', 'hzzo.hr', '/e-zdravstveno/novosti', 'HZZO - e-Zdravstveno novosti', 'NEWS_LISTING', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"focus": "portal_updates"}'),
  ('ep-hzzo-sifrarnici', 'hzzo.hr', '/poslovni-subjekti/hzzo-za-partnere/sifrarnici-hzzo-0', 'HZZO - Šifrarnici', 'CODE_LISTS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"formats": ["xlsx", "xls"], "contains": ["DBL", "DTP"]}'),
  ('ep-hzzo-lijekovi', 'hzzo.hr', '/zdravstvena-zastita/objavljene-liste-lijekova', 'HZZO - Liste lijekova', 'TECHNICAL_DOCS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"lists": ["Osnovna", "Dopunska"], "format": "xlsx"}'),
  ('ep-hzzo-natjecaji', 'hzzo.hr', '/natjecaji', 'HZZO - Natječaji', 'ANNOUNCEMENTS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"archive": "/natjecaji/natjecaji-arhiva/"}'),

-- HZMO
  ('ep-hzmo-doplatak', 'mirovinsko.hr', '/hr/doplatak-za-djecu/12', 'HZMO - Doplatak za djecu', 'LEGAL_ACTS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"contains": ["income_thresholds", "eligibility"]}'),
  ('ep-hzmo-statistika', 'mirovinsko.hr', '/hr/statistika/860', 'HZMO - Statistika', 'STATISTICS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"frequency": "monthly"}'),
  ('ep-hzmo-savjetovanja', 'mirovinsko.hr', '/hr/savjetovanje-s-javnoscu/46', 'HZMO - Savjetovanja s javnošću', 'CONSULTATIONS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, NULL),

-- Porezna uprava
  ('ep-porezna-propisi', 'porezna-uprava.gov.hr', '/hr/propisi-3950/3950', 'Porezna uprava - Propisi', 'LEGAL_ACTS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"navigation": "tree-view", "requires_js": true}'),
  ('ep-porezna-fisk-tech', 'porezna.gov.hr', '/fiskalizacija/gotovinski-racuni', 'Porezna - Fiskalizacija tehničke spec', 'TECHNICAL_DOCS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"versions": ["WSDL 1.8", "WSDL 1.9"], "techSpec": "v2.6"}'),

-- FINA
  ('ep-fina-eracun-jn', 'fina.hr', '/obavijesti/e-racun-u-javnoj-nabavi', 'FINA - e-Račun javna nabava', 'ANNOUNCEMENTS', 'HIGH', 'DAILY', 'PAGINATION', NULL, '?page={N}', true, '{"deadline": "2025-12-31"}'),
  ('ep-fina-certifikati', 'fina.hr', '/obavijesti/digitalni-certifikati', 'FINA - Digitalni certifikati', 'ANNOUNCEMENTS', 'HIGH', 'DAILY', 'PAGINATION', NULL, '?page={N}', true, '{"contains": ["PKI", "TLS", "CA"]}'),

-- Ministry of Finance
  ('ep-mfin-zakoni', 'mfin.gov.hr', '/istaknute-teme/zakoni-i-propisi/523', 'MFIN - Zakoni i propisi', 'LEGAL_ACTS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"categories": 15}'),
  ('ep-mfin-porezi', 'mfin.gov.hr', '/istaknute-teme/zakoni-i-propisi/porezi/533', 'MFIN - Porezni propisi', 'LEGAL_ACTS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, NULL);

-- ============================================================================
-- TIER 3: MEDIUM PRIORITY (Check 2-3x per week)
-- ============================================================================

INSERT INTO "DiscoveryEndpoint" (id, domain, path, name, "endpointType", priority, "scrapeFrequency", "listingStrategy", "urlPattern", "paginationPattern", "isActive", metadata)
VALUES
-- HZZO
  ('ep-hzzo-odluke-uv', 'hzzo.hr', '/o-nama/upravno-vijece/odluke-uv', 'HZZO - Odluke Upravnog vijeća', 'LEGAL_ACTS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"years": "2013-2025"}'),
  ('ep-hzzo-financijski', 'hzzo.hr', '/o-nama/financijski-planovi', 'HZZO - Financijski planovi', 'STATISTICS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),

-- HZMO
  ('ep-hzmo-tiskanice-mirovine', 'mirovinsko.hr', '/hr/tiskanice-1098/1098', 'HZMO - Tiskanice mirovine', 'FORMS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"categories": 15}'),
  ('ep-hzmo-tiskanice-doplatak', 'mirovinsko.hr', '/hr/tiskanice-1100/1100', 'HZMO - Tiskanice doplatak', 'FORMS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),
  ('ep-hzmo-tiskanice-prijave', 'mirovinsko.hr', '/hr/tiskanice-1102/1102', 'HZMO - Tiskanice prijave/odjave', 'FORMS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),
  ('ep-hzmo-prijave', 'mirovinsko.hr', '/hr/prijave-i-odjave-na-osiguranje/234', 'HZMO - Prijave i odjave', 'LEGAL_ACTS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),

-- Porezna uprava
  ('ep-porezna-faq', 'porezna-uprava.gov.hr', '/hr/pitanja-i-odgovori-vezani-uz-zakon-o-fiskalizaciji-8031/8031', 'Porezna - FAQ Fiskalizacija', 'ANNOUNCEMENTS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"updated": "2025-12-04"}'),
  ('ep-porezna-obrasci', 'porezna-uprava.gov.hr', '/hr/propisani-obrasci/3955', 'Porezna uprava - Obrasci', 'FORMS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"format": "PDF"}'),
  ('ep-porezna-vodici', 'porezna-uprava.gov.hr', '/hr/vodici-za-ispunjavanje-poreznih-prava-i-obveza/3953', 'Porezna uprava - Vodiči', 'TECHNICAL_DOCS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),
  ('ep-porezna-posrednici', 'porezna-uprava.gov.hr', '/hr/popis-informacijskih-posrednika/8019', 'Porezna - Informacijski posrednici', 'TECHNICAL_DOCS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"count": 33, "updated": "2025-12-17"}'),

-- FINA
  ('ep-fina-eracun-main', 'fina.hr', '/digitalizacija-poslovanja/e-racun', 'FINA - e-Račun usluga', 'TECHNICAL_DOCS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"packages": 10, "deadline": "2025-12-31"}'),
  ('ep-fina-savjetuje', 'fina.hr', '/fina-savjetuje', 'FINA - Fina savjetuje', 'ANNOUNCEMENTS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),

-- Ministry of Finance
  ('ep-mfin-konzultacije', 'mfin.gov.hr', '/istaknute-teme/javne-konzultacije/524', 'MFIN - Javne konzultacije', 'CONSULTATIONS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"externalPortal": "savjetovanja.gov.hr"}'),
  ('ep-mfin-proracun', 'mfin.gov.hr', '/proracun-86/86', 'MFIN - Proračun', 'STATISTICS', 'MEDIUM', 'TWICE_WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"years": "2018-2026"}');

-- ============================================================================
-- TIER 4: LOW PRIORITY (Check weekly)
-- ============================================================================

INSERT INTO "DiscoveryEndpoint" (id, domain, path, name, "endpointType", priority, "scrapeFrequency", "listingStrategy", "urlPattern", "paginationPattern", "isActive", metadata)
VALUES
-- HZZO
  ('ep-hzzo-izvjesca', 'hzzo.hr', '/o-nama/izvjesca', 'HZZO - Izvješća', 'STATISTICS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"years": "2001-2024"}'),

-- HZMO
  ('ep-hzmo-dokumenti', 'mirovinsko.hr', '/hr/dokumenti/568', 'HZMO - Dokumenti', 'TECHNICAL_DOCS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),
  ('ep-hzmo-plan-rada', 'mirovinsko.hr', '/hr/plan-rada-zavoda/2691', 'HZMO - Plan rada', 'STATISTICS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"years": "2015-2026"}'),
  ('ep-hzmo-financijska', 'mirovinsko.hr', '/hr/izvjesca-o-financijskom-poslovanju/2695', 'HZMO - Financijska izvješća', 'STATISTICS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"years": "2015-2023"}'),
  ('ep-hzmo-javna-nabava', 'mirovinsko.hr', '/hr/javna-nabava/48', 'HZMO - Javna nabava', 'ANNOUNCEMENTS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"subsections": 9}'),

-- Porezna uprava
  ('ep-porezna-planovi', 'porezna-uprava.gov.hr', '/hr/planovi-rada-i-izvjestaji/4013', 'Porezna - Planovi rada', 'STATISTICS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"years": "2020-2026"}'),
  ('ep-porezna-kpd', 'porezna-uprava.gov.hr', '/hr/klasifikacija-proizvoda-kpd-2025/7718', 'Porezna - KPD 2025', 'CODE_LISTS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"externalApp": "KLASUS"}'),
  ('ep-porezna-mikroeracun', 'porezna-uprava.gov.hr', '/hr/mikroeracun/8190', 'Porezna - MIKROeRAČUN', 'TECHNICAL_DOCS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"milestone": "2027-01-01"}'),

-- FINA
  ('ep-fina-earhiv', 'fina.hr', '/obavijesti/fina-e-arhiv', 'FINA - e-Arhiv obavijesti', 'ANNOUNCEMENTS', 'LOW', 'WEEKLY', 'PAGINATION', NULL, '?page={N}', true, NULL),
  ('ep-fina-edrazba', 'fina.hr', '/obavijesti/e-drazba', 'FINA - e-Dražba obavijesti', 'ANNOUNCEMENTS', 'LOW', 'WEEKLY', 'PAGINATION', NULL, '?page={N}', true, NULL),
  ('ep-fina-certifikati-main', 'fina.hr', '/poslovni-digitalni-certifikati', 'FINA - Poslovni digitalni certifikati', 'TECHNICAL_DOCS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),

-- Ministry of Finance
  ('ep-mfin-eu', 'mfin.gov.hr', '/istaknute-teme/hrvatska-i-eu/108', 'MFIN - Hrvatska i EU', 'LEGAL_ACTS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL),
  ('ep-mfin-bilten', 'mfin.gov.hr', '/istaknute-teme/sredisnja-harmonizacijska-jedinica/bilten/220', 'MFIN - CHU Bilten', 'STATISTICS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"frequency": "semi-annual", "currentIssue": 37}'),
  ('ep-mfin-publikacije', 'mfin.gov.hr', '/publikacije-52/52', 'MFIN - Publikacije', 'STATISTICS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, '{"categories": 6}'),
  ('ep-mfin-transparentnost', 'mfin.gov.hr', '/istaknute-teme/transparentnost-3682/3682', 'MFIN - Transparentnost', 'STATISTICS', 'LOW', 'WEEKLY', 'HTML_LIST', NULL, NULL, true, NULL);

-- ============================================================================
-- EXTERNAL PORTAL (for reference, monitored separately)
-- ============================================================================

INSERT INTO "DiscoveryEndpoint" (id, domain, path, name, "endpointType", priority, "scrapeFrequency", "listingStrategy", "urlPattern", "paginationPattern", "isActive", metadata)
VALUES
  ('ep-savjetovanja', 'savjetovanja.gov.hr', '/', 'e-Savjetovanja - Central portal', 'CONSULTATIONS', 'HIGH', 'DAILY', 'HTML_LIST', NULL, NULL, true, '{"note": "Central government consultation portal, monitors all ministries"}');

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total endpoints: 46
-- Tier 1 (CRITICAL): 12 endpoints
-- Tier 2 (HIGH): 14 endpoints
-- Tier 3 (MEDIUM): 16 endpoints
-- Tier 4 (LOW): 16 endpoints
-- External: 1 endpoint
--
-- Domains covered: 7
-- - narodne-novine.nn.hr
-- - hzzo.hr
-- - mirovinsko.hr
-- - porezna-uprava.gov.hr
-- - porezna.gov.hr
-- - fina.hr
-- - mfin.gov.hr
-- - savjetovanja.gov.hr (external)
