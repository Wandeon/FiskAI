# Croatian Fiscalization in FiskAI

FiskAI includes full support for Croatian fiscalization (Fiskalizacija) as required by Croatian tax law.

## What is Fiscalization?

Fiscalization is the process of reporting invoices to the Croatian Tax Authority (CIS - Centralni Informacijski Sustav). All B2C and most B2B invoices must be fiscalized to receive a JIR (Jedinstveni Identifikator Računa - Unique Invoice Identifier).

## Quick Overview

### Key Components

1. **ZKI (Zaštitni Kod Izdavatelja)** - Protective code calculated from invoice data
2. **JIR (Jedinstveni Identifikator Računa)** - Unique identifier received from tax authority
3. **Business Premises** - Physical locations where business is conducted
4. **Payment Devices** - Cash registers or POS terminals

### System Architecture

```
Invoice Creation → ZKI Calculation → Send to Provider → Receive JIR → Update Invoice
```

## Getting Started

### 1. Development Setup (Mock Provider)

```bash
# Add to .env.local
echo "FISCAL_PROVIDER=mock" >> .env.local
```

### 2. Configure Business Premises

Before fiscalizing invoices, set up at least one business premises and payment device in your application settings.

### 3. Fiscalize an Invoice

```typescript
import { fiscalizeInvoice } from '@/app/actions/fiscalize'

const result = await fiscalizeInvoice(invoiceId)

if (result.success) {
  console.log('JIR:', result.jir)
  console.log('ZKI:', result.zki)
}
```

### 4. Display on Invoice

```typescript
{invoice.fiscalizedAt && (
  <div className="fiscal-info">
    <p><strong>ZKI:</strong> {invoice.zki}</p>
    <p><strong>JIR:</strong> {invoice.jir}</p>
  </div>
)}
```

## Production Setup

### 1. Choose a Provider

FiskAI supports:
- **Mock Provider** - For development and testing
- **IE-Računi** - Production fiscalization service
- **FINA** - Direct integration (coming soon)

### 2. Configure IE-Računi

```bash
# .env.production
FISCAL_PROVIDER=ie-racuni
IE_RACUNI_API_KEY=your_production_key
IE_RACUNI_SANDBOX=false  # Start with true for testing
```

### 3. Obtain FINA Certificate

For production fiscalization, you need a digital certificate from FINA:
1. Apply at [FINA](https://www.fina.hr/)
2. Receive .pfx certificate file
3. Store securely on your server

### 4. Go Live Checklist

- [ ] Register company with FINA
- [ ] Obtain digital certificate
- [ ] Sign up with fiscalization provider
- [ ] Test in sandbox environment
- [ ] Register business premises
- [ ] Configure payment devices
- [ ] Test with real invoices
- [ ] Switch to production mode

## Documentation

Comprehensive documentation is available:

- **[FISCALIZATION.md](./FISCALIZATION.md)** - Complete technical guide
- **[docs/FISCALIZATION-INTEGRATION.md](./docs/FISCALIZATION-INTEGRATION.md)** - Integration guide for developers
- **[PHASE-15-SUMMARY.md](./PHASE-15-SUMMARY.md)** - Implementation details
- **[examples/fiscalization-example.ts](./examples/fiscalization-example.ts)** - Code examples

## Features

- ✅ Automatic ZKI calculation
- ✅ Mock provider for development
- ✅ IE-Računi integration ready
- ✅ Multi-tenant support
- ✅ Croatian VAT rates (25%, 13%, 5%, 0%)
- ✅ All payment methods supported
- ✅ Input validation
- ✅ Error handling
- ✅ Status checking
- ✅ TypeScript types
- ✅ Unit tests included

## API Reference

### Server Actions

```typescript
// Fiscalize an invoice
fiscalizeInvoice(invoiceId: string)
  → Promise<{ success: boolean, jir?: string, zki?: string, error?: string }>

// Check fiscalization status
checkFiscalStatus(invoiceId: string)
  → Promise<{ success: boolean, status: string, jir?: string }>

// Cancel fiscalized invoice (typically not allowed)
cancelFiscalizedInvoice(invoiceId: string)
  → Promise<{ success: boolean, error?: string }>
```

### Utilities

```typescript
// Calculate ZKI
import { calculateZKI, validateZKIInput } from '@/lib/e-invoice'

const zki = calculateZKI({
  oib: '12345678901',
  dateTime: new Date(),
  invoiceNumber: '2024/1-1-1',
  premisesCode: '1',
  deviceCode: '1',
  totalAmount: 125000  // in cents
})

// Get fiscal provider
import { getFiscalProvider } from '@/lib/e-invoice'

const provider = getFiscalProvider()
const result = await provider.send(fiscalInvoice)
```

## Testing

Run the test suite:

```bash
npm test -- zki.test.ts
```

Try the examples:

```bash
npx ts-node examples/fiscalization-example.ts
```

## Legal Compliance

FiskAI's fiscalization implementation complies with:

- Croatian Tax Administration requirements
- Technical specification for fiscalization
- ZKI calculation algorithm (RSA-SHA256 + MD5)
- JIR format and storage
- VAT rate structure
- Payment method codes
- Business premises registration

## Support

For fiscalization support:

1. Check the [documentation](./FISCALIZATION.md)
2. Review [integration guide](./docs/FISCALIZATION-INTEGRATION.md)
3. Try the [examples](./examples/fiscalization-example.ts)
4. Contact your fiscalization provider
5. Consult with tax advisor for legal questions

## Resources

- [Croatian Tax Authority](https://www.porezna-uprava.hr/)
- [Fiscalization Technical Spec](https://www.porezna-uprava.hr/HR_Fiskalizacija/Stranice/Tehnicka-specifikacija.aspx)
- [FINA](https://www.fina.hr/)

## License

Fiscalization implementation is part of FiskAI and subject to the same license.

---

**Note**: This implementation provides the technical infrastructure for fiscalization. You are responsible for ensuring compliance with Croatian tax law and obtaining necessary certificates and registrations.
