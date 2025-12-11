import type { Capabilities } from "./capabilities"

export interface InvoiceVisibility {
  showVatFields: boolean
  requireOib: boolean
}

export function getInvoiceVisibility(capabilities: Capabilities): InvoiceVisibility {
  return {
    showVatFields: capabilities.visibility.requireVatFields,
    requireOib: capabilities.visibility.requireOib,
  }
}
