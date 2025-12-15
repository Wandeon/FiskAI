# Feature: Business Premises Setup (F066)

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 22

## Purpose

The Business Premises Setup feature enables users to configure poslovni prostori (business premises) and naplatni uređaji (POS devices) required for Croatian fiscalization compliance. Each business premises has a unique numeric code and contains one or more payment devices, which together form the legal invoice numbering structure (broj-poslovni_prostor-naplatni_uređaj). The feature includes default premises/device management, duplicate code prevention, and automatic invoice sequence tracking, ensuring invoices comply with Croatian Tax Authority requirements.

## User Entry Points

| Type | Path               | Evidence                                            |
| ---- | ------------------ | --------------------------------------------------- |
| Page | /settings/premises | `src/app/(dashboard)/settings/premises/page.tsx:11` |
| Link | Settings page      | `src/app/(dashboard)/settings/page.tsx:111-116`     |
| Link | Compliance tab     | `src/app/(dashboard)/settings/page.tsx:231-238`     |

## Core Flow

1. User navigates to /settings/premises → `src/app/(dashboard)/settings/premises/page.tsx:11`
2. System loads authenticated user and company → `src/app/(dashboard)/settings/premises/page.tsx:12-13`
3. System sets tenant context for database isolation → `src/app/(dashboard)/settings/premises/page.tsx:15-18`
4. System fetches all business premises with devices → `src/app/(dashboard)/settings/premises/page.tsx:20-28`
5. System displays info card explaining Croatian invoice format → `src/app/(dashboard)/settings/premises/page.tsx:46-53`
6. User enters new premises details (code, name, address) → `src/app/(dashboard)/settings/premises/premises-form.tsx:44-73`
7. User optionally marks premises as default → `src/app/(dashboard)/settings/premises/premises-form.tsx:75-78`
8. User submits premises form → `src/app/(dashboard)/settings/premises/premises-form.tsx:19-41`
9. System validates code is positive integer → `src/app/actions/premises.ts:31-33`
10. System checks for duplicate code within company → `src/app/actions/premises.ts:36-47`
11. System unsets other defaults if new premises is default → `src/app/actions/premises.ts:50-55`
12. System creates BusinessPremises record → `src/app/actions/premises.ts:57-66`
13. System revalidates route and shows success toast → `src/app/actions/premises.ts:68-69`
14. User clicks "Dodaj uređaj" on premises card → `src/app/(dashboard)/settings/premises/devices-list.tsx:51-53`
15. User enters device details (code, name) → `src/app/(dashboard)/settings/premises/devices-list.tsx:100-118`
16. System validates device code and checks for duplicates within premises → `src/app/actions/premises.ts:161-177`
17. System creates PaymentDevice record → `src/app/actions/premises.ts:187-196`
18. System uses default premises/device for invoice numbering → `src/lib/invoice-numbering.ts:37-88`

## Key Modules

| Module                      | Purpose                                            | Location                                                  |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| PremisesPage                | Server component for premises management page      | `src/app/(dashboard)/settings/premises/page.tsx`          |
| PremisesForm                | Client form for creating new premises              | `src/app/(dashboard)/settings/premises/premises-form.tsx` |
| DevicesList                 | Client component for managing devices per premises | `src/app/(dashboard)/settings/premises/devices-list.tsx`  |
| createPremises              | Server action to create business premises          | `src/app/actions/premises.ts:28-74`                       |
| createDevice                | Server action to create payment device             | `src/app/actions/premises.ts:158-204`                     |
| updatePremises              | Server action to update premises                   | `src/app/actions/premises.ts:76-120`                      |
| updateDevice                | Server action to update device                     | `src/app/actions/premises.ts:206-254`                     |
| deletePremises              | Server action to delete premises with validation   | `src/app/actions/premises.ts:122-156`                     |
| deleteDevice                | Server action to delete device                     | `src/app/actions/premises.ts:256-265`                     |
| getDefaultPremisesAndDevice | Retrieves default premises and device              | `src/app/actions/premises.ts:267-286`                     |
| getNextInvoiceNumber        | Generates invoice number using premises/device     | `src/lib/invoice-numbering.ts:37-126`                     |

## Premises Management Features

### Business Premises Card

- **Premises List Display** → `src/app/(dashboard)/settings/premises/page.tsx:72-122`
  - Shows all premises ordered by code → `src/app/(dashboard)/settings/premises/page.tsx:27`
  - Empty state when no premises exist → `src/app/(dashboard)/settings/premises/page.tsx:72-81`
  - Building icon and explanatory text → `src/app/(dashboard)/settings/premises/page.tsx:76-79`
  - Each premises in bordered card → `src/app/(dashboard)/settings/premises/page.tsx:83-121`

- **Premises Code Badge** → `src/app/(dashboard)/settings/premises/page.tsx:88-90`
  - Monospace font display → `src/app/(dashboard)/settings/premises/page.tsx:88`
  - Gray background badge → `src/app/(dashboard)/settings/premises/page.tsx:88`
  - Prominently shows numeric code → `src/app/(dashboard)/settings/premises/page.tsx:89`

- **Default Premises Indicator** → `src/app/(dashboard)/settings/premises/page.tsx:99-103`
  - Green badge for default premises → `src/app/(dashboard)/settings/premises/page.tsx:100`
  - "Zadani" label → `src/app/(dashboard)/settings/premises/page.tsx:101`
  - Shown only when isDefault=true → `src/app/(dashboard)/settings/premises/page.tsx:99`
  - Green border on card → `src/app/(dashboard)/settings/premises/page.tsx:84`

- **Inactive Status Indicator** → `src/app/(dashboard)/settings/premises/page.tsx:104-108`
  - Red badge for inactive premises → `src/app/(dashboard)/settings/premises/page.tsx:105`
  - "Neaktivan" label → `src/app/(dashboard)/settings/premises/page.tsx:106`
  - Shown when isActive=false → `src/app/(dashboard)/settings/premises/page.tsx:104`

### Premises Creation Form

- **Form Layout** → `src/app/(dashboard)/settings/premises/premises-form.tsx:44-84`
  - 4-column responsive grid → `src/app/(dashboard)/settings/premises/premises-form.tsx:44`
  - Inline submission with loading state → `src/app/(dashboard)/settings/premises/premises-form.tsx:17-41`
  - Success toast and form reset → `src/app/(dashboard)/settings/premises/premises-form.tsx:35-37`

- **Code Field** → `src/app/(dashboard)/settings/premises/premises-form.tsx:45-56`
  - Numeric input type → `src/app/(dashboard)/settings/premises/premises-form.tsx:50`
  - Minimum value 1 → `src/app/(dashboard)/settings/premises/premises-form.tsx:51`
  - Required field → `src/app/(dashboard)/settings/premises/premises-form.tsx:52`
  - Monospace font → `src/app/(dashboard)/settings/premises/premises-form.tsx:54`
  - Placeholder: "1" → `src/app/(dashboard)/settings/premises/premises-form.tsx:53`

- **Name Field** → `src/app/(dashboard)/settings/premises/premises-form.tsx:57-65`
  - Text input → `src/app/(dashboard)/settings/premises/premises-form.tsx:59`
  - Required field → `src/app/(dashboard)/settings/premises/premises-form.tsx:62`
  - Placeholder: "Glavni ured" → `src/app/(dashboard)/settings/premises/premises-form.tsx:63`

- **Address Field** → `src/app/(dashboard)/settings/premises/premises-form.tsx:66-73`
  - Optional text input → `src/app/(dashboard)/settings/premises/premises-form.tsx:69`
  - Placeholder: "Ilica 123, Zagreb" → `src/app/(dashboard)/settings/premises/premises-form.tsx:71`
  - Stored in address column → `prisma/schema.prisma:301`

- **Default Checkbox** → `src/app/(dashboard)/settings/premises/premises-form.tsx:75-78`
  - Checkbox input → `src/app/(dashboard)/settings/premises/premises-form.tsx:76`
  - "Zadani" label → `src/app/(dashboard)/settings/premises/premises-form.tsx:77`
  - Sets isDefault flag → `src/app/(dashboard)/settings/premises/premises-form.tsx:29`

- **Submit Button** → `src/app/(dashboard)/settings/premises/premises-form.tsx:79-81`
  - Disabled during loading → `src/app/(dashboard)/settings/premises/premises-form.tsx:79`
  - Shows "Spremanje..." when loading → `src/app/(dashboard)/settings/premises/premises-form.tsx:80`
  - Shows "Dodaj" when idle → `src/app/(dashboard)/settings/premises/premises-form.tsx:80`

## Payment Device Management

### Devices List Display

- **Devices Section** → `src/app/(dashboard)/settings/premises/devices-list.tsx:47-98`
  - Header with device count → `src/app/(dashboard)/settings/premises/devices-list.tsx:48-55`
  - "Dodaj uređaj" button → `src/app/(dashboard)/settings/premises/devices-list.tsx:51-53`
  - Empty state when no devices → `src/app/(dashboard)/settings/premises/devices-list.tsx:57-68`

- **Device Empty State** → `src/app/(dashboard)/settings/premises/devices-list.tsx:58-67`
  - Dashed border card → `src/app/(dashboard)/settings/premises/devices-list.tsx:58`
  - Explanatory text about requirement → `src/app/(dashboard)/settings/premises/devices-list.tsx:60`
  - "Dodaj prvi uređaj" link → `src/app/(dashboard)/settings/premises/devices-list.tsx:62-67`

- **Device Cards** → `src/app/(dashboard)/settings/premises/devices-list.tsx:70-96`
  - Each device in gray background row → `src/app/(dashboard)/settings/premises/devices-list.tsx:72-95`
  - Code in monospace badge → `src/app/(dashboard)/settings/premises/devices-list.tsx:77-79`
  - Device name displayed → `src/app/(dashboard)/settings/premises/devices-list.tsx:80`
  - Default badge (green) → `src/app/(dashboard)/settings/premises/devices-list.tsx:83-86`
  - Inactive badge (red) → `src/app/(dashboard)/settings/premises/devices-list.tsx:88-92`

### Device Creation Form

- **Inline Form** → `src/app/(dashboard)/settings/premises/devices-list.tsx:99-138`
  - Shown when isAdding=true → `src/app/(dashboard)/settings/premises/devices-list.tsx:99`
  - 3-column grid layout → `src/app/(dashboard)/settings/premises/devices-list.tsx:101`
  - Gray background panel → `src/app/(dashboard)/settings/premises/devices-list.tsx:100`

- **Device Code Field** → `src/app/(dashboard)/settings/premises/devices-list.tsx:102-111`
  - Numeric input → `src/app/(dashboard)/settings/premises/devices-list.tsx:105`
  - Minimum value 1 → `src/app/(dashboard)/settings/premises/devices-list.tsx:106`
  - Required → `src/app/(dashboard)/settings/premises/devices-list.tsx:107`
  - Monospace font → `src/app/(dashboard)/settings/premises/devices-list.tsx:109`
  - Placeholder: "Kod (npr. 1)" → `src/app/(dashboard)/settings/premises/devices-list.tsx:108`

- **Device Name Field** → `src/app/(dashboard)/settings/premises/devices-list.tsx:112-118`
  - Text input → `src/app/(dashboard)/settings/premises/devices-list.tsx:114`
  - Required → `src/app/(dashboard)/settings/premises/devices-list.tsx:115`
  - Placeholder: "Naziv (npr. Blagajna 1)" → `src/app/(dashboard)/settings/premises/devices-list.tsx:116`

- **Form Actions** → `src/app/(dashboard)/settings/premises/devices-list.tsx:119-136`
  - Default checkbox → `src/app/(dashboard)/settings/premises/devices-list.tsx:120-123`
  - Submit button (disabled when loading) → `src/app/(dashboard)/settings/premises/devices-list.tsx:124-126`
  - Cancel button → `src/app/(dashboard)/settings/premises/devices-list.tsx:127-135`

## Server-Side Logic

### Premises Creation

- **Validation** → `src/app/actions/premises.ts:28-47`
  - Validates code is positive → `src/app/actions/premises.ts:31-33`
  - Checks for duplicate code → `src/app/actions/premises.ts:36-47`
  - Uses unique constraint on [companyId, code] → `prisma/schema.prisma:310`
  - Returns error message if duplicate → `src/app/actions/premises.ts:46`

- **Default Management** → `src/app/actions/premises.ts:50-55`
  - If isDefault=true, unsets existing defaults → `src/app/actions/premises.ts:50-55`
  - Updates all company premises where isDefault=true → `src/app/actions/premises.ts:51-54`
  - Sets isDefault=false on others → `src/app/actions/premises.ts:53`

- **Record Creation** → `src/app/actions/premises.ts:57-66`
  - Creates BusinessPremises record → `src/app/actions/premises.ts:57`
  - Sets companyId, code, name → `src/app/actions/premises.ts:59-61`
  - Optional address field → `src/app/actions/premises.ts:62`
  - isDefault defaults to false → `src/app/actions/premises.ts:63`
  - isActive defaults to true → `src/app/actions/premises.ts:64`

- **Route Revalidation** → `src/app/actions/premises.ts:68`
  - Revalidates /settings/premises path → `src/app/actions/premises.ts:68`
  - Triggers UI refresh → `src/app/(dashboard)/settings/premises/premises-form.tsx:36`

### Device Creation

- **Validation** → `src/app/actions/premises.ts:158-177`
  - Validates code is positive → `src/app/actions/premises.ts:161-163`
  - Checks duplicate within premises → `src/app/actions/premises.ts:166-177`
  - Uses unique constraint [businessPremisesId, code] → `prisma/schema.prisma:327`
  - Error: "Naplatni uređaj s kodom {code} već postoji" → `src/app/actions/premises.ts:176`

- **Default Device Management** → `src/app/actions/premises.ts:180-185`
  - If isDefault=true, unsets other defaults → `src/app/actions/premises.ts:180-185`
  - Updates within same businessPremisesId → `src/app/actions/premises.ts:182`
  - Only one default device per premises → `src/app/actions/premises.ts:181-184`

- **Record Creation** → `src/app/actions/premises.ts:187-196`
  - Creates PaymentDevice record → `src/app/actions/premises.ts:187`
  - Links to companyId and businessPremisesId → `src/app/actions/premises.ts:189-190`
  - Sets code, name, isDefault, isActive → `src/app/actions/premises.ts:191-194`

### Delete Validation

- **Premises Deletion** → `src/app/actions/premises.ts:122-156`
  - Checks if premises has devices → `src/app/actions/premises.ts:125-134`
  - Error if devices exist → `src/app/actions/premises.ts:130-133`
  - Checks if premises has invoice sequences → `src/app/actions/premises.ts:136-146`
  - Error if historical invoices exist → `src/app/actions/premises.ts:142-145`
  - Prevents deletion with history → `src/app/actions/premises.ts:148`

- **Device Deletion** → `src/app/actions/premises.ts:256-265`
  - Simple delete operation → `src/app/actions/premises.ts:258`
  - No cascade validation → `src/app/actions/premises.ts:256-265`
  - Revalidates path → `src/app/actions/premises.ts:259`

## Invoice Numbering Integration

### Default Selection

- **Get Default Premises and Device** → `src/app/actions/premises.ts:267-286`
  - Finds default active premises → `src/app/actions/premises.ts:271-274`
  - Returns null if no default premises → `src/app/actions/premises.ts:276-278`
  - Finds default device for premises → `src/app/actions/premises.ts:280-283`
  - Returns premises and device objects → `src/app/actions/premises.ts:285`

### Invoice Number Generation

- **Auto-Creation** → `src/lib/invoice-numbering.ts:44-88`
  - Uses default premises if not specified → `src/lib/invoice-numbering.ts:47-49`
  - Creates default premises if none exists → `src/lib/invoice-numbering.ts:52-62`
  - Default code: 1, name: "Glavni ured" → `src/lib/invoice-numbering.ts:56-57`
  - Creates default device code: 1 → `src/lib/invoice-numbering.ts:78-87`

- **Sequence Management** → `src/lib/invoice-numbering.ts:90-108`
  - Upserts InvoiceSequence by [businessPremisesId, year] → `src/lib/invoice-numbering.ts:92-108`
  - Atomic increment of lastNumber → `src/lib/invoice-numbering.ts:100`
  - Creates new sequence starting at 1 → `src/lib/invoice-numbering.ts:102-107`
  - Tracks per-premises, per-year sequences → `prisma/schema.prisma:331-343`

- **Number Format** → `src/lib/invoice-numbering.ts:110-126`
  - Format: {broj}-{poslovni_prostor}-{naplatni_uređaj} → `src/lib/invoice-numbering.ts:115`
  - Example: "43-1-1" → `src/app/(dashboard)/settings/premises/page.tsx:50`
  - Internal reference: {year}/{invoice_number} → `src/lib/invoice-numbering.ts:116`
  - Example: "2025/43-1-1" → `src/lib/invoice-numbering.ts:10`

## Data

### Database Tables

- **BusinessPremises** → `prisma/schema.prisma:296-312`
  - Primary table for poslovni prostori
  - Key fields:
    - id: CUID primary key → `prisma/schema.prisma:297`
    - companyId: Foreign key to Company → `prisma/schema.prisma:298`
    - code: Integer code (unique within company) → `prisma/schema.prisma:299`
    - name: Premises name → `prisma/schema.prisma:300`
    - address: Optional address → `prisma/schema.prisma:301`
    - isDefault: Default premises flag → `prisma/schema.prisma:302`
    - isActive: Active status → `prisma/schema.prisma:303`
  - Relations:
    - company: Company relation → `prisma/schema.prisma:306`
    - sequences: InvoiceSequence[] → `prisma/schema.prisma:307`
    - devices: PaymentDevice[] → `prisma/schema.prisma:308`
  - Constraints:
    - Unique [companyId, code] → `prisma/schema.prisma:310`
    - Index on companyId → `prisma/schema.prisma:311`

- **PaymentDevice** → `prisma/schema.prisma:314-329`
  - Table for naplatni uređaji (POS devices)
  - Key fields:
    - id: CUID primary key → `prisma/schema.prisma:315`
    - companyId: Foreign key to Company → `prisma/schema.prisma:316`
    - businessPremisesId: Foreign key to BusinessPremises → `prisma/schema.prisma:317`
    - code: Integer code (unique within premises) → `prisma/schema.prisma:318`
    - name: Device name → `prisma/schema.prisma:319`
    - isDefault: Default device flag → `prisma/schema.prisma:320`
    - isActive: Active status → `prisma/schema.prisma:321`
  - Relations:
    - businessPremises: BusinessPremises relation → `prisma/schema.prisma:324`
    - company: Company relation → `prisma/schema.prisma:325`
  - Constraints:
    - Unique [businessPremisesId, code] → `prisma/schema.prisma:327`
    - Index on companyId → `prisma/schema.prisma:328`

- **InvoiceSequence** → `prisma/schema.prisma:331-343`
  - Tracks sequential invoice numbers per premises per year
  - Key fields:
    - id: CUID primary key → `prisma/schema.prisma:332`
    - companyId: Foreign key to Company → `prisma/schema.prisma:333`
    - businessPremisesId: Foreign key to BusinessPremises → `prisma/schema.prisma:334`
    - year: Fiscal year → `prisma/schema.prisma:335`
    - lastNumber: Last issued number (atomic increment) → `prisma/schema.prisma:336`
  - Relations:
    - businessPremises: BusinessPremises relation → `prisma/schema.prisma:338`
    - company: Company relation → `prisma/schema.prisma:339`
  - Constraints:
    - Unique [businessPremisesId, year] → `prisma/schema.prisma:341`
    - Index on companyId → `prisma/schema.prisma:342`

## Integrations

### Croatian Tax Authority Requirements

- **Invoice Number Format** → `src/app/(dashboard)/settings/premises/page.tsx:48-52`
  - Legal requirement per Croatian fiscalization law → `src/app/(dashboard)/settings/premises/page.tsx:49`
  - Format: broj-poslovni_prostor-naplatni_uređaj → `src/app/(dashboard)/settings/premises/page.tsx:50`
  - Example: 43-1-1 → `src/app/(dashboard)/settings/premises/page.tsx:50`
  - All three components required → `FISCALIZATION.md:4-7`

- **Business Premises Registration** → `FISCALIZATION.md:23-31`
  - Physical location where business is conducted → `FISCALIZATION.md:24`
  - Unique numeric code per location → `FISCALIZATION.md:25`
  - Must be registered with tax authority → `FISCALIZATION.md:26`
  - Associated with payment devices → `FISCALIZATION.md:31`

- **Payment Device Registration** → `FISCALIZATION.md:28-31`
  - Cash register or POS terminal → `FISCALIZATION.md:29`
  - Unique numeric code per device → `FISCALIZATION.md:30`
  - Associated with business premises → `FISCALIZATION.md:31`

### Invoice Creation Flow

- **Integration Point** → `src/app/actions/invoice.ts:60`
  - createInvoice calls getNextInvoiceNumber → `src/app/actions/invoice.ts:60`
  - Uses default premises/device if not specified → `src/lib/invoice-numbering.ts:45-49`
  - Auto-creates if missing → `src/lib/invoice-numbering.ts:52-87`

- **E-Invoice Integration** → `src/app/actions/e-invoice.ts:147`
  - convertToInvoice also uses getNextInvoiceNumber → `src/app/actions/e-invoice.ts:147`
  - Maintains same numbering sequence → `src/lib/invoice-numbering.ts:92-108`

## Dependencies

- **Depends on**:
  - [[auth-login]] - User authentication required → `src/app/(dashboard)/settings/premises/page.tsx:12`
  - [[company-management]] - Company must exist → `src/app/(dashboard)/settings/premises/page.tsx:13`
  - [[tenant-isolation]] - Multi-tenant data separation → `src/app/(dashboard)/settings/premises/page.tsx:15-18`

- **Depended by**:
  - [[invoicing-create]] - Uses premises for invoice numbering → `src/app/actions/invoice.ts:60`
  - [[e-invoicing-convert]] - Uses premises when converting → `src/app/actions/e-invoice.ts:147`
  - [[fiscalization]] - Requires premises for fiscalization → `FISCALIZATION.md:94-96`
  - [[invoice-numbering]] - Core dependency for number generation → `src/lib/invoice-numbering.ts:37-126`

## Verification Checklist

- [ ] User can access /settings/premises with authentication
- [ ] Link to premises page visible in settings sidebar
- [ ] Info card explains Croatian invoice number format
- [ ] Premises creation form displays with all fields
- [ ] Code field requires positive integer
- [ ] System prevents duplicate premises codes within company
- [ ] Default checkbox unsets other defaults when checked
- [ ] Success toast shown after premises creation
- [ ] New premises appears in list immediately
- [ ] Default badge shown on default premises
- [ ] Inactive badge shown on inactive premises
- [ ] "Dodaj uređaj" button appears on premises card
- [ ] Device creation form shows inline on premises
- [ ] System prevents duplicate device codes within premises
- [ ] Default device checkbox unsets other defaults within premises
- [ ] Empty state shown when no devices exist
- [ ] Device cards display code and name correctly
- [ ] Cannot delete premises with devices attached
- [ ] Cannot delete premises with invoice history
- [ ] Invoice numbering uses default premises/device
- [ ] Auto-creates default premises if none exists
- [ ] Invoice sequences tracked per premises per year
- [ ] Invoice number format follows {broj}-{prostor}-{uređaj}

## Evidence Links

1. Premises page entry point → `src/app/(dashboard)/settings/premises/page.tsx:11`
2. Premises form component → `src/app/(dashboard)/settings/premises/premises-form.tsx:15`
3. Devices list component → `src/app/(dashboard)/settings/premises/devices-list.tsx:17`
4. Create premises action → `src/app/actions/premises.ts:28`
5. Create device action → `src/app/actions/premises.ts:158`
6. Update premises action → `src/app/actions/premises.ts:76`
7. Delete premises action → `src/app/actions/premises.ts:122`
8. Get default premises/device → `src/app/actions/premises.ts:267`
9. Invoice numbering integration → `src/lib/invoice-numbering.ts:37`
10. Invoice number format → `src/lib/invoice-numbering.ts:115`
11. BusinessPremises schema → `prisma/schema.prisma:296`
12. PaymentDevice schema → `prisma/schema.prisma:314`
13. InvoiceSequence schema → `prisma/schema.prisma:331`
14. Unique constraint on premises code → `prisma/schema.prisma:310`
15. Unique constraint on device code → `prisma/schema.prisma:327`
16. Settings page link → `src/app/(dashboard)/settings/page.tsx:111-116`
17. Compliance tab link → `src/app/(dashboard)/settings/page.tsx:231-238`
18. Info card with format explanation → `src/app/(dashboard)/settings/premises/page.tsx:46-53`
19. Empty state component → `src/components/ui/empty-state.tsx:12`
20. Default management logic → `src/app/actions/premises.ts:50-55`
21. Tenant context setup → `src/app/(dashboard)/settings/premises/page.tsx:15-18`
22. Route revalidation → `src/app/actions/premises.ts:68`
