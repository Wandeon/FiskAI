# Golden Fixtures

These are real documents from the e-Poslovanje test environment.

## golden-invoice-194571

**Source:** e-Poslovanje test environment
**Date:** 2026-01-04
**Status:** Validated & Signed (failed to deliver to recipient - recipient not in AMS)

### Metadata (golden-invoice-194571-metadata.json)
```json
{
  "id": 194571,
  "documentId": "E-DRY-RUN-1767553782200",
  "documentType": "Invoice",
  "issuedOn": "2026-01-04T19:09:42",
  "amount": 1250,
  "currency": "EUR",
  "supplierPartyName": "Metrica d.o.o.",
  "supplierPartyVATId": "45480824373",
  "customerPartyName": "INOXMONT-VS d.o.o.",
  "customerPartyVATId": "17079690143"
}
```

### Invoice Details (golden-invoice-194571.xml)
- **Specification:** CIUS-2025 (`urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.hr:cius-2025:1.0#conformant#urn:mfin.gov.hr:ext-2025:1.0`)
- **Net amount:** 1,000.00 EUR
- **VAT (25%):** 250.00 EUR
- **Total:** 1,250.00 EUR
- **Line item:** "Konzultantske usluge za razvoj softvera" (Software development consulting services)
- **Quantity:** 10 HUR (hours) @ 100 EUR/hour
- **Digitally signed:** Yes (by e-Poslovanje certificate)

### Key UBL Elements
```xml
<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.hr:cius-2025:1.0#conformant#urn:mfin.gov.hr:ext-2025:1.0</cbc:CustomizationID>
<cbc:ProfileID>P1</cbc:ProfileID>
<cbc:ID>E-DRY-RUN-1767553782200</cbc:ID>
<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
```

### Supplier Party
```xml
<cbc:EndpointID schemeID="9934">45480824373</cbc:EndpointID>
<cbc:Name>Metrica d.o.o.</cbc:Name>
<cbc:CompanyID>HR45480824373</cbc:CompanyID>
```

### Customer Party
```xml
<cbc:EndpointID schemeID="9934">17079690143</cbc:EndpointID>
<cbc:Name>INOXMONT-VS d.o.o.</cbc:Name>
<cbc:CompanyID>HR17079690143</cbc:CompanyID>
```

## Using These Fixtures

These fixtures can be used for:

1. **UBL Generation Testing** - Compare generated UBL against this golden example
2. **Provider Integration Testing** - Verify request/response handling
3. **Validation Testing** - Use as reference for valid CIUS-2025 format

## Notes

- The invoice was signed by e-Poslovanje's certificate, not our own
- Delivery failed because recipient (INOXMONT-VS d.o.o.) is not registered in test AMS
- This proves the e-Poslovanje API connection works end-to-end
