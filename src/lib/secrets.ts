import crypto from "crypto"

const SECRET = process.env.EINVOICE_KEY_SECRET
const ALGORITHM = "aes-256-gcm"

function getKey() {
  if (!SECRET) {
    throw new Error("EINVOICE_KEY_SECRET is not configured")
  }
  return crypto.createHash("sha256").update(SECRET).digest()
}

export function encryptSecret(value: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("hex"), encrypted.toString("hex"), tag.toString("hex")].join(":")
}

export function decryptSecret(value: string): string {
  const key = getKey()
  const [ivHex, dataHex, tagHex] = value.split(":")
  if (!ivHex || !dataHex || !tagHex) {
    throw new Error("Invalid secret format")
  }
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

export function decryptOptionalSecret(value?: string | null): string | null {
  if (!value) {
    return null
  }
  return decryptSecret(value)
}
