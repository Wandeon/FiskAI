// Shared utilities and constants for FiskAI
export * from './schemas';
export * from './validations';

// Croatian VAT rates
export const VAT_RATES = {
  STANDARD: 25,
  REDUCED: 13,
  SUPER_REDUCED: 5,
  ZERO: 0,
} as const;

// Croatian invoice number format helper
export function formatInvoiceNumber(
  number: number,
  businessPremisesCode: string,
  paymentDeviceCode: string
): string {
  return `${number}-${businessPremisesCode}-${paymentDeviceCode}`;
}

// Money utilities (always work with cents/lipe)
export function centsToEuros(cents: number): number {
  return cents / 100;
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function formatMoney(cents: number, currency: string = 'EUR'): string {
  const euros = centsToEuros(cents);
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency,
  }).format(euros);
}
