# News Article Template - Example

This document shows how to use the enhanced news article template with structured sections.

## Structured Sections

The news article template now supports four standardized sections that are automatically extracted and rendered with distinct styling:

### 1. TL;DR (Required for high-impact articles)

Add a `## TL;DR` section at the beginning of your content for a quick summary:

```markdown
## TL;DR

Vlada je donijela izmjene poreznog zakona koje stupaju na snagu 1. siječnja 2026. Ključne promjene:

- Prag za PDV se povećava s 60.000€ na 75.000€
- Novi izvještaj za samostalne djelatnosti (obrazac PO-SD2)
- Plaćanje doprinosa mijenja se na kvartalno
```

**Renders as:** Blue highlighted box at the top of the article with lightning bolt icon.

---

### 2. Što napraviti (What to do)

Add a `## Što napraviti` section with action items:

```markdown
## Što napraviti

- Provjerite svoje prihode u 2025. godini i projekcije za 2026.
- Ako ste blizu praga, razmotriti dobrovoljni upis u PDV sustav
- Ažurirajte svoje kalkulacije pomoću PDV kalkulatora
- Kontaktirajte računovođu do 15. prosinca 2025.
- Prijavite se u sustav eFiskalizacije najkasnije 30 dana prije prijelaza
```

**Renders as:** Green highlighted box with checklist icons.

---

### 3. Povezani alati (Related Tools)

Add a `## Povezani alati` section with links to relevant tools:

```markdown
## Povezani alati

- [PDV Kalkulator](/alati/pdv-kalkulator)
- [Kalkulator doprinosa](/alati/kalkulator-doprinosa)
- [Kalendar rokova](/alati/kalendar)
- [Generator uplatnica](/alati/uplatnice)
```

**Renders as:** Cyan highlighted box with tool links displayed in a grid.

---

### 4. Izvori (Sources)

Sources are automatically pulled from the database (newsPostSources table) and rendered prominently.

**Renders as:** Purple highlighted box with external link icons.

---

## Full Example Article

```markdown
## TL;DR

Nova uredba o PDV-u stupila je na snagu. Glavne promjene: viši prag za obveznike (75.000€), nova prijava, i kvartalno plaćanje doprinosa.

---

# Naslov članka ide ovdje u glavnom tekstu

Uvodni paragraf s objašnjenjem što se događa...

## Što se mijenja?

Detaljan opis promjena...

## Tko je pogođen?

Lista korisnika koji su pogođeni...

## Što napraviti

- Provjerite svoje prihode i projekcije
- Razmotriti dobrovoljni upis ako ste blizu praga
- Kontaktirajte računovođu
- Ažurirajte kalkulacije

## Povezani alati

- [PDV Kalkulator](/alati/pdv-kalkulator)
- [Kalkulator doprinosa](/alati/kalkulator-doprinosa)
- [Kalendar rokova](/alati/kalendar)
```

---

## Color Scheme

Each section has a distinct color to help readers quickly identify information:

- **TL;DR**: Blue (quick overview)
- **Što napraviti**: Green (action items/checklist)
- **Povezani alati**: Cyan (helpful tools)
- **Izvori**: Purple (external sources)

---

## Technical Implementation

The template automatically:

1. Extracts structured sections using regex pattern matching
2. Removes them from main content to avoid duplication
3. Renders them in styled, prominent boxes at appropriate positions
4. Falls back gracefully if sections are not present

Sections are optional - articles will render normally even without them.
