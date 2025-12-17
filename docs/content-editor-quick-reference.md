# Content Editor Quick Reference - News Articles

## Adding Structured Sections to News Articles

Copy and paste these templates into your markdown content. The system will automatically extract and style them.

---

## Template 1: TL;DR (Quick Summary)

```markdown
## TL;DR

[2-4 sentence summary of the article. Include key facts, dates, and impact.]

Example:
Vlada je donijela nove izmjene PDV zakona koje stupaju na snagu 1. siječnja 2026. Prag za obveznu registraciju se povećava s 60.000€ na 75.000€ godišnjeg prihoda. Postojeći PDV obveznici moraju podnijeti novi obrazac PO-PDV2 do kraja siječnja 2026.
```

**Renders as:** Blue box with lightning bolt icon at the top of the article.

---

## Template 2: Action Items

```markdown
## Što napraviti

- [First action - be specific and include deadlines if relevant]
- [Second action - order by priority]
- [Third action - make it actionable]
- [Fourth action - include who should do it if relevant]
- [Fifth action - link to tools using markdown links if helpful]

Example:

- Provjerite svoje prihode za 2025. godinu pomoću [PDV kalkulatora](/alati/pdv-kalkulator)
- Ako ste blizu praga (55.000€+), razmotriti dobrovoljni upis u PDV sustav
- Kontaktirajte svog računovođu do 15. prosinca 2025.
- Pripremite dokumentaciju za prelazak najkasnije mjesec dana prije
- Prijavite se u sustav eFiskalizacije ako još niste
```

**Renders as:** Green box with checkmark icons next to each item.

---

## Template 3: Related Tools

```markdown
## Povezani alati

[Tool Name 1](/alati/tool-slug-1)
[Tool Name 2](/alati/tool-slug-2)
[Tool Name 3](/alati/tool-slug-3)
[Tool Name 4](/alati/tool-slug-4)

Example:

- [PDV Kalkulator](/alati/pdv-kalkulator)
- [Kalkulator doprinosa](/alati/kalkulator-doprinosa)
- [Kalendar rokova](/alati/kalendar)
- [Generator uplatnica](/alati/uplatnice)
```

**Renders as:** Cyan box with tools displayed in a 2-column grid.

**Available Tools:**

- `/alati/kalkulator-doprinosa` - Kalkulator doprinosa
- `/alati/kalkulator-poreza` - Kalkulator poreza
- `/alati/pdv-kalkulator` - PDV prag (60.000€)
- `/alati/uplatnice` - Generator uplatnica
- `/alati/kalendar` - Kalendar rokova
- `/alati/oib-validator` - OIB Validator
- `/alati/e-racun` - E-Račun Generator

---

## Full Article Example

```markdown
## TL;DR

Nova uredba o PDV-u donosi važne promjene za samostalne djelatnike. Prag za obvezu registracije raste na 75.000€, uvodi se novi obrazac za prijavu, a plaćanje doprinosa prelazi na kvartalni ritam. Promjene stupaju na snagu 1. siječnja 2026.

# Izmjene PDV zakona: Što trebate znati

[Your article introduction...]

## Glavne promjene

[Detailed content about changes...]

## Tko je pogođen ovim promjenama?

[Detailed content about who is affected...]

## Što napraviti

- Pregledajte svoje prihode za 2025. godinu
- Ako ste između 60.000€ i 75.000€, imate rok do 31.12.2025. za odjavu
- Kontaktirajte računovođu za savjet do 15. prosinca 2025.
- Ažurirajte svoje kalkulacije korištenjem PDV kalkulatora
- Pripremite potrebnu dokumentaciju najkasnije mjesec dana prije roka

## Povezani alati

- [PDV Kalkulator](/alati/pdv-kalkulator)
- [Kalkulator doprinosa](/alati/kalkulator-doprinosa)
- [Kalendar rokova](/alati/kalendar)

## Dodatne napomene

[Any additional important information...]
```

---

## Important Notes

### Do's:

✅ Use exact section headings: `## TL;DR`, `## Što napraviti`, `## Povezani alati`
✅ Keep TL;DR concise (2-4 sentences max)
✅ Make action items specific and actionable
✅ Include deadlines in action items when relevant
✅ Link to actual tools in the `/alati` section
✅ Order action items by priority/urgency

### Don'ts:

❌ Don't use different heading formats (must be `##`)
❌ Don't add these sections if not relevant to the article
❌ Don't include vague action items
❌ Don't link to tools that don't exist
❌ Don't duplicate content between TL;DR and main article

---

## When to Use Each Section

### TL;DR

**Use when:**

- Article is longer than 3 paragraphs
- There are multiple important points
- Impact level is medium or high
- Time-sensitive information

**Skip when:**

- Very short announcements
- Simple updates with single point

### Što napraviti

**Use when:**

- Readers need to take action
- There are deadlines to meet
- Changes require preparation
- Multiple steps involved

**Skip when:**

- Purely informational articles
- No action required from readers
- General news/updates

### Povezani alati

**Use when:**

- Article discusses calculations (taxes, contributions, VAT)
- Deadlines mentioned (link to calendar)
- Payments discussed (link to payment slips)
- Tools exist that help with the topic

**Skip when:**

- No relevant tools available
- Topic is purely conceptual
- General policy discussion

---

## Testing Your Content

Before publishing, check:

1. ✓ Section headings are exactly `## TL;DR`, `## Što napraviti`, `## Povezani alati`
2. ✓ Action items start with `-` or `*`
3. ✓ Tool links use proper markdown format `[Text](/path)`
4. ✓ Tool paths are correct and tools exist
5. ✓ No duplicate content between sections and main body
6. ✓ TL;DR is concise and captures essence

---

## Sources

**Important:** Sources are managed separately in the admin panel. The "Izvori" section is automatically generated from the database (newsPostSources table) and doesn't need to be added to the markdown content.

To add sources:

1. Go to admin panel
2. Edit the news post
3. Link source articles via the interface
4. Sources will automatically appear in the purple "Izvori" section
