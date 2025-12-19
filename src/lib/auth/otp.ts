// src/lib/auth/otp.ts
import { randomInt } from "crypto"
import bcrypt from "bcryptjs"

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export function generateOTP(): string {
  // Generate number between 100000 and 999999
  const code = randomInt(100000, 1000000)
  return code.toString()
}

/**
 * Hash an OTP code for secure storage
 */
export async function hashOTP(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

/**
 * Verify an OTP code against its hash
 */
export async function verifyOTP(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash)
}

/**
 * OTP expiration time in minutes
 */
export const OTP_EXPIRY_MINUTES = 10
