import { calculateZKI, validateZKIInput, type ZKIInput } from '../zki'

/**
 * Test suite for ZKI calculation
 *
 * Run with: npm test -- zki.test.ts
 */

describe('ZKI Calculation', () => {
  const validInput: ZKIInput = {
    oib: '12345678901',
    dateTime: new Date('2024-12-15T14:30:25'),
    invoiceNumber: '2024/1-1-1',
    premisesCode: '1',
    deviceCode: '1',
    totalAmount: 125000 // 1250.00 EUR in cents
  }

  describe('calculateZKI', () => {
    it('should calculate ZKI without private key (demo mode)', () => {
      const zki = calculateZKI(validInput)

      expect(zki).toBeDefined()
      expect(zki.length).toBe(32)
      expect(/^[a-f0-9]{32}$/.test(zki)).toBe(true)
    })

    it('should calculate consistent ZKI for same input', () => {
      const zki1 = calculateZKI(validInput)
      const zki2 = calculateZKI(validInput)

      expect(zki1).toBe(zki2)
    })

    it('should calculate different ZKI for different inputs', () => {
      const zki1 = calculateZKI(validInput)
      const zki2 = calculateZKI({
        ...validInput,
        invoiceNumber: '2024/1-1-2'
      })

      expect(zki1).not.toBe(zki2)
    })

    it('should handle different amounts correctly', () => {
      const zki1 = calculateZKI({ ...validInput, totalAmount: 100000 })
      const zki2 = calculateZKI({ ...validInput, totalAmount: 200000 })

      expect(zki1).not.toBe(zki2)
    })
  })

  describe('validateZKIInput', () => {
    it('should validate correct input', () => {
      const result = validateZKIInput(validInput)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid OIB (not 11 digits)', () => {
      const result = validateZKIInput({
        ...validInput,
        oib: '123456789' // only 9 digits
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('OIB must be exactly 11 digits')
    })

    it('should reject empty invoice number', () => {
      const result = validateZKIInput({
        ...validInput,
        invoiceNumber: ''
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invoice number is required')
    })

    it('should reject zero or negative amounts', () => {
      const result = validateZKIInput({
        ...validInput,
        totalAmount: 0
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Total amount must be positive')
    })

    it('should reject invalid date', () => {
      const result = validateZKIInput({
        ...validInput,
        dateTime: new Date('invalid')
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid date/time')
    })
  })
})
