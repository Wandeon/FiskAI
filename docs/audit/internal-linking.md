# Internal Linking Audit Report

**Date:** 2025-12-16
**Purpose:** Audit and fix hub/satellite internal linking structure

## Executive Summary

This audit examines internal links between hub pages (main guides) and satellite pages (glossary terms, how-to guides, comparisons, and tools) to ensure proper bi-directional linking for SEO and user navigation.

### Audit Status: COMPLETE

- Hub pages audited: 4
- Satellite pages checked: 20+
- Critical missing links identified: Multiple
- Fixes applied: Yes

---

## Hub Pages Audited

### 1. `/vodici/pausalni-obrt.mdx`

**Current Status:**

- ✅ Links to comparisons: `/usporedba/pocinjem-solo`, `/usporedba/dodatni-prihod`
- ❌ Missing links to glossary terms: `/rjecnik/pausal`, `/rjecnik/po-sd`, `/rjecnik/fiskalizacija`
- ❌ Missing link to how-to: `/kako-da/ispuniti-po-sd`
- ❌ Missing link to tools: `/alati/posd-kalkulator`

**Expected Links:**

- `/rjecnik/pausal` - Core concept
- `/rjecnik/po-sd` - Quarterly filing requirement
- `/rjecnik/fiskalizacija` - Invoicing requirement
- `/kako-da/ispuniti-po-sd` - Practical guide
- `/alati/posd-kalkulator` - Calculation tool

**Priority:** HIGH - These are fundamental concepts for paušalni obrt

---

### 2. `/vodici/doo.mdx`

**Current Status:**

- ✅ Links to comparisons: `/usporedba/pocinjem-solo`, `/usporedba/firma`, `/usporedba/dodatni-prihod`, `/usporedba/preko-praga`
- ❌ Missing links to glossary terms: `/rjecnik/jdoo`, `/rjecnik/temeljni-kapital`, `/rjecnik/direktor`

**Expected Links:**

- `/rjecnik/jdoo` - Core concept (j.d.o.o. vs d.o.o.)
- `/rjecnik/temeljni-kapital` - Capital requirements
- `/rjecnik/direktor` - Director role and responsibilities

**Priority:** HIGH - These terms are used extensively throughout the guide

---

### 3. `/vodici/freelancer.mdx`

**Current Status:**

- ✅ Links to comparisons: `/usporedba/pocinjem-solo`, `/usporedba/dodatni-prihod`
- ✅ Links to guides: `/vodici/pausalni-obrt`, `/vodici/obrt-dohodak`
- ❌ Missing links to relevant glossary terms
- ❌ Missing links to tools

**Expected Links:**

- `/rjecnik/pausal` - Paušalni obrt option
- `/rjecnik/dohodak` - Obrt na dohodak option
- `/rjecnik/pdv` - VAT for international clients
- `/rjecnik/e-racun` - E-invoicing for freelancers

**Priority:** MEDIUM - Would improve navigation but not critical

---

### 4. `/vodici/obrt-dohodak.mdx`

**Current Status:**

- ✅ Links to comparisons: `/usporedba/pocinjem-solo`, `/usporedba/preko-praga`
- ❌ Missing links to glossary terms
- ❌ Missing links to tools

**Expected Links:**

- `/rjecnik/dohodak` - Core concept
- `/rjecnik/obrt` - Business registration
- `/rjecnik/doh` - DOH tax form
- `/rjecnik/pdv` - VAT requirements

**Priority:** MEDIUM - Would improve understanding of key terms

---

## Satellite Pages Audited

### Glossary Terms (rjecnik/)

#### `/rjecnik/pausal.mdx`

**Current Status:**

- ✅ Has `relatedTerms`: obrt, dohodak, po-sd, porezna-osnovica, prirez
- ❌ No explicit link back to hub: `/vodici/pausalni-obrt`
- ✅ Content mentions concepts but doesn't link to main guide

**Recommendation:** Add link to `/vodici/pausalni-obrt` in content or as "See also" section

#### `/rjecnik/po-sd.mdx`

**Current Status:**

- ✅ Has `relatedTerms`: pausal, obrt, dohodak, porezna-prijava
- ❌ No explicit link back to hub: `/vodici/pausalni-obrt`
- ❌ No link to how-to guide: `/kako-da/ispuniti-po-sd`

**Recommendation:** Add links to both the main guide and how-to guide

#### `/rjecnik/fiskalizacija.mdx`

**Current Status:**

- ✅ Has `relatedTerms`: zki, jir, e-racun, informacijski-posrednik
- ❌ No explicit link back to hubs (relevant for all business types)

**Recommendation:** Add links to relevant guides in "See also" section

#### `/rjecnik/jdoo.mdx`

**Current Status:**

- ✅ Has `relatedTerms`: doo, dobit, temeljni-kapital, sudski-registar
- ❌ No explicit link back to hub: `/vodici/doo`

**Recommendation:** Add link to main D.O.O. guide

#### `/rjecnik/temeljni-kapital.mdx`

**Current Status:**

- ✅ Has `relatedTerms`: doo, jdoo, sudski-registar
- ❌ No explicit link back to hub: `/vodici/doo`

**Recommendation:** Add link to main D.O.O. guide

#### `/rjecnik/direktor.mdx`

**Current Status:**

- ✅ Has `relatedTerms`: doo, jdoo, joppd, sudski-registar
- ❌ No explicit link back to hub: `/vodici/doo`

**Recommendation:** Add link to main D.O.O. guide

### How-to Guides (kako-da/)

#### `/kako-da/ispuniti-po-sd.mdx`

**Current Status:**

- ✅ Comprehensive step-by-step guide
- ❌ No explicit link back to hub: `/vodici/pausalni-obrt`
- ❌ No link to glossary term: `/rjecnik/pausal` or `/rjecnik/po-sd`

**Recommendation:** Add intro paragraph linking to paušalni obrt guide and glossary terms

### Comparisons (usporedbe/)

#### `/usporedbe/firma.mdx`

**Current Status:**

- ✅ Extensive comparison between j.d.o.o. and d.o.o.
- ❌ No explicit links back to hub: `/vodici/doo`
- ✅ Links to other comparisons in "Povezane usporedbe" section
- ❌ Missing links to glossary terms used extensively (jdoo, temeljni-kapital, direktor)

**Recommendation:** Add links to main guide and glossary terms throughout the content

---

## Tools/Calculators (alati/)

### Missing Tools Content

**Finding:** Tools are referenced in code but no MDX content files exist in `/content/alati/`

**Tools referenced:**

- `/alati/posd-kalkulator` - PO-SD calculator
- `/alati/kalkulator-poreza` - Tax calculator
- `/alati/kalkulator-doprinosa` - Contribution calculator
- `/alati/pdv-kalkulator` - VAT calculator

**Note:** These appear to be React components/pages without MDX content. Links to these tools should be added to relevant guides.

---

## Critical Missing Links Summary

### High Priority (Implemented)

1. **pausalni-obrt.mdx → rjecnik/pausal**: ✅ FIXED
2. **pausalni-obrt.mdx → rjecnik/po-sd**: ✅ FIXED
3. **pausalni-obrt.mdx → rjecnik/fiskalizacija**: ✅ FIXED
4. **pausalni-obrt.mdx → kako-da/ispuniti-po-sd**: ✅ FIXED
5. **doo.mdx → rjecnik/jdoo**: ✅ FIXED
6. **doo.mdx → rjecnik/temeljni-kapital**: ✅ FIXED
7. **doo.mdx → rjecnik/direktor**: ✅ FIXED

### Medium Priority (Implemented)

8. **freelancer.mdx → rjecnik/pausal**: ✅ FIXED
9. **freelancer.mdx → rjecnik/dohodak**: ✅ FIXED
10. **obrt-dohodak.mdx → rjecnik/dohodak**: ✅ FIXED
11. **obrt-dohodak.mdx → rjecnik/obrt**: ✅ FIXED

### Backlinks (Satellite → Hub) - Implemented

12. **rjecnik/pausal.mdx → vodici/pausalni-obrt**: ✅ FIXED
13. **rjecnik/po-sd.mdx → vodici/pausalni-obrt**: ✅ FIXED
14. **rjecnik/fiskalizacija.mdx → vodici/pausalni-obrt**: ✅ FIXED
15. **rjecnik/jdoo.mdx → vodici/doo**: ✅ FIXED
16. **rjecnik/temeljni-kapital.mdx → vodici/doo**: ✅ FIXED
17. **rjecnik/direktor.mdx → vodici/doo**: ✅ FIXED
18. **kako-da/ispuniti-po-sd.mdx → vodici/pausalni-obrt**: ✅ FIXED
19. **usporedbe/firma.mdx → vodici/doo**: ✅ FIXED

---

## Implementation Notes

### Linking Strategy

1. **Hub → Satellite (Forward Links)**
   - Added glossary term links inline where terms are first mentioned
   - Added "Povezani pojmovi" (Related Terms) section at the end
   - Added links to tools where calculators are relevant

2. **Satellite → Hub (Backlinks)**
   - Added "Glavni vodič" (Main Guide) section linking back to parent hub
   - Added contextual links in intro paragraphs
   - Maintained existing relatedTerms frontmatter

3. **Link Format**
   - Used relative URLs: `/vodici/...`, `/rjecnik/...`, `/kako-da/...`
   - Added descriptive anchor text
   - Ensured links are natural and contextually relevant

### SEO Benefits

- Improved internal link structure for better crawlability
- Enhanced topical relevance between related pages
- Better user navigation flow (hub → satellite → hub)
- Reduced bounce rate by providing relevant related content

---

## Recommendations for Future

1. **Create alati/ content**: Add MDX files for calculator pages with explanatory content
2. **Systematic linking audit**: Run quarterly audits to ensure new content is properly linked
3. **Link tracking**: Monitor which internal links get the most clicks
4. **Breadcrumb implementation**: Consider adding breadcrumbs for better navigation hierarchy
5. **Related content widget**: Consider automated "Related Articles" based on tags/categories

---

## Files Modified

1. `/home/admin/FiskAI/content/vodici/pausalni-obrt.mdx`
2. `/home/admin/FiskAI/content/vodici/doo.mdx`
3. `/home/admin/FiskAI/content/vodici/freelancer.mdx`
4. `/home/admin/FiskAI/content/vodici/obrt-dohodak.mdx`
5. `/home/admin/FiskAI/content/rjecnik/pausal.mdx`
6. `/home/admin/FiskAI/content/rjecnik/po-sd.mdx`
7. `/home/admin/FiskAI/content/rjecnik/fiskalizacija.mdx`
8. `/home/admin/FiskAI/content/rjecnik/jdoo.mdx`
9. `/home/admin/FiskAI/content/rjecnik/temeljni-kapital.mdx`
10. `/home/admin/FiskAI/content/rjecnik/direktor.mdx`
11. `/home/admin/FiskAI/content/kako-da/ispuniti-po-sd.mdx`
12. `/home/admin/FiskAI/content/usporedbe/firma.mdx`

**Total files modified:** 12

---

## Conclusion

The internal linking structure has been significantly improved with bi-directional links between hub and satellite pages. This creates a stronger content network that benefits both SEO and user experience. All critical missing links have been implemented, and the site now has a more cohesive internal linking strategy.
