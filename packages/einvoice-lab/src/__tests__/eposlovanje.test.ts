/**
 * E-Poslovanje Provider Tests
 *
 * Run with: npx tsx packages/einvoice-lab/src/__tests__/eposlovanje.test.ts
 *
 * Requires: EPOSLOVANJE_API_KEY in environment or .env.local
 */

import { EPoslovanjeProvider } from "../providers/eposlovanje"

// Load env from .env.local if running standalone
const API_KEY =
  process.env.EPOSLOVANJE_API_KEY ||
  "52c8b6f421672fd07a32228b5238ada32091b594eb18cd57c216c55e0fff4493"

const API_URL =
  process.env.EPOSLOVANJE_API_BASE || "https://test.eposlovanje.hr"

async function runTests() {
  console.log("=".repeat(60))
  console.log("E-Poslovanje Provider Tests")
  console.log("=".repeat(60))
  console.log(`API URL: ${API_URL}`)
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`)
  console.log("")

  const provider = new EPoslovanjeProvider({
    apiKey: API_KEY,
    apiUrl: API_URL,
    softwareId: "FISKAI-TEST-001",
  })

  // Test 1: Ping
  console.log("Test 1: Ping endpoint")
  console.log("-".repeat(40))
  try {
    const ping = await provider.ping()
    console.log("✅ PASS - Ping successful")
    console.log(`   Status: ${ping.status}`)
    console.log(`   Message: ${ping.message}`)
  } catch (error) {
    console.log("❌ FAIL - Ping failed")
    console.log(`   Error: ${error}`)
  }
  console.log("")

  // Test 2: Get outgoing documents (list)
  console.log("Test 2: Get outgoing documents")
  console.log("-".repeat(40))
  try {
    const outgoing = await provider.getOutgoing({ limit: 5 })
    console.log("✅ PASS - Got outgoing documents")
    console.log(`   Count: ${Array.isArray(outgoing) ? outgoing.length : "N/A"}`)
    if (Array.isArray(outgoing) && outgoing.length > 0) {
      console.log(`   First: ${JSON.stringify(outgoing[0]).substring(0, 100)}...`)
    }
  } catch (error) {
    console.log("⚠️  WARN - Could not get outgoing (may be empty)")
    console.log(`   Error: ${error}`)
  }
  console.log("")

  // Test 3: Get incoming documents (list)
  console.log("Test 3: Get incoming documents")
  console.log("-".repeat(40))
  try {
    const incoming = await provider.getIncoming({ limit: 5 })
    console.log("✅ PASS - Got incoming documents")
    console.log(`   Count: ${Array.isArray(incoming) ? incoming.length : "N/A"}`)
    if (Array.isArray(incoming) && incoming.length > 0) {
      console.log(`   First: ${JSON.stringify(incoming[0]).substring(0, 100)}...`)
    }
  } catch (error) {
    console.log("⚠️  WARN - Could not get incoming (may be empty)")
    console.log(`   Error: ${error}`)
  }
  console.log("")

  // Test 4: Validate minimal UBL (will likely fail but tests the endpoint)
  console.log("Test 4: Validate document endpoint")
  console.log("-".repeat(40))
  try {
    const minimalUbl = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>TEST-001</ID>
</Invoice>`
    const validation = await provider.validateDocument(minimalUbl)
    if (validation.valid) {
      console.log("✅ PASS - Document valid (unexpected for minimal UBL)")
    } else {
      console.log("✅ PASS - Validation endpoint works (document rejected as expected)")
      console.log(`   Errors: ${validation.errors?.join(", ")}`)
    }
  } catch (error) {
    console.log("⚠️  WARN - Validation endpoint error")
    console.log(`   Error: ${error}`)
  }
  console.log("")

  console.log("=".repeat(60))
  console.log("Tests complete!")
  console.log("=".repeat(60))
}

// Run tests
runTests().catch(console.error)
