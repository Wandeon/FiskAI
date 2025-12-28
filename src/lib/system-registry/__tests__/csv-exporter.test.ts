/**
 * CSV Exporter Tests
 *
 * Comprehensive tests for the CSV exporter following RFC 4180.
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { exportCsv, escapeCsvField, parseCsv } from "../exporters/csv"
import type { CsvExportOptions } from "../exporters/csv"
import type { SystemComponent, CriticalPath } from "../schema"

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Create a minimal valid component for testing.
 */
function createMinimalComponent(overrides: Partial<SystemComponent> = {}): SystemComponent {
  return {
    componentId: "lib-test",
    type: "LIB",
    name: "Test Library",
    status: "STABLE",
    criticality: "MEDIUM",
    owner: null,
    docsRef: null,
    codeRef: null,
    dependencies: [],
    ...overrides,
  }
}

/**
 * Create a fully-populated component for testing.
 */
function createFullComponent(): SystemComponent {
  return {
    componentId: "lib-auth",
    type: "LIB",
    name: "Auth Library",
    status: "STABLE",
    criticality: "CRITICAL",
    owner: "team:security",
    docsRef: "docs/auth.md",
    codeRef: "src/lib/auth/",
    dependencies: [
      { componentId: "lib-db", type: "HARD" },
      { componentId: "lib-config", type: "SOFT" },
    ],
    healthCheck: {
      endpoint: "/api/health/auth",
    },
    slo: {
      availability: "99.9%",
      latencyP99: "500ms",
    },
    alertChannel: "#ops-critical",
    runbook: "docs/runbooks/lib-auth.md",
  }
}

const EMPTY_CRITICAL_PATHS: CriticalPath[] = []

// =============================================================================
// ESCAPE CSV FIELD TESTS
// =============================================================================

describe("escapeCsvField", () => {
  describe("basic values", () => {
    it("returns simple string unchanged", () => {
      assert.equal(escapeCsvField("hello"), "hello")
    })

    it("returns empty string unchanged", () => {
      assert.equal(escapeCsvField(""), "")
    })

    it("returns number-like string unchanged", () => {
      assert.equal(escapeCsvField("12345"), "12345")
    })

    it("returns path without special chars unchanged", () => {
      assert.equal(escapeCsvField("src/lib/auth/"), "src/lib/auth/")
    })
  })

  describe("comma handling", () => {
    it("quotes field containing comma", () => {
      assert.equal(escapeCsvField("lib-db,lib-config"), '"lib-db,lib-config"')
    })

    it("quotes field with multiple commas", () => {
      assert.equal(escapeCsvField("a,b,c,d"), '"a,b,c,d"')
    })

    it("uses custom delimiter for quoting decision", () => {
      // With semicolon delimiter, comma doesn't need quoting
      assert.equal(escapeCsvField("lib-db,lib-config", ";"), "lib-db,lib-config")
      // But semicolon does need quoting
      assert.equal(escapeCsvField("lib-db;lib-config", ";"), '"lib-db;lib-config"')
    })
  })

  describe("quote handling (RFC 4180)", () => {
    it("quotes field containing double-quote", () => {
      assert.equal(escapeCsvField('say "hello"'), '"say ""hello"""')
    })

    it("escapes multiple double-quotes", () => {
      assert.equal(escapeCsvField('a"b"c'), '"a""b""c"')
    })

    it("handles quote at beginning", () => {
      assert.equal(escapeCsvField('"quoted'), '"""quoted"')
    })

    it("handles quote at end", () => {
      assert.equal(escapeCsvField('quoted"'), '"quoted"""')
    })

    it("handles only quotes", () => {
      // Input: "" (2 quotes)
      // Each quote becomes "" (doubled), so 2 quotes -> 4 quotes
      // Then wrapped in quotes: """""" (6 chars total)
      assert.equal(escapeCsvField('""'), '""""""')
    })
  })

  describe("newline handling", () => {
    it("quotes field containing LF newline", () => {
      assert.equal(escapeCsvField("line1\nline2"), '"line1\nline2"')
    })

    it("quotes field containing CR", () => {
      assert.equal(escapeCsvField("line1\rline2"), '"line1\rline2"')
    })

    it("quotes field containing CRLF", () => {
      assert.equal(escapeCsvField("line1\r\nline2"), '"line1\r\nline2"')
    })
  })

  describe("combined special characters", () => {
    it("handles comma and quote together", () => {
      assert.equal(escapeCsvField('a,b"c'), '"a,b""c"')
    })

    it("handles comma and newline together", () => {
      assert.equal(escapeCsvField("a,b\nc"), '"a,b\nc"')
    })

    it("handles all special characters", () => {
      assert.equal(escapeCsvField('a,b\n"c'), '"a,b\n""c"')
    })
  })
})

// =============================================================================
// PARSE CSV TESTS
// =============================================================================

describe("parseCsv", () => {
  it("parses simple CSV", () => {
    const csv = "a,b,c\n1,2,3"
    const result = parseCsv(csv)
    assert.deepEqual(result, [
      ["a", "b", "c"],
      ["1", "2", "3"],
    ])
  })

  it("parses quoted fields", () => {
    const csv = '"a,b",c,d'
    const result = parseCsv(csv)
    assert.deepEqual(result, [["a,b", "c", "d"]])
  })

  it("parses escaped quotes", () => {
    const csv = '"say ""hello""",b,c'
    const result = parseCsv(csv)
    assert.deepEqual(result, [['say "hello"', "b", "c"]])
  })

  it("parses empty fields", () => {
    const csv = "a,,c"
    const result = parseCsv(csv)
    assert.deepEqual(result, [["a", "", "c"]])
  })

  it("handles custom delimiter", () => {
    const csv = "a;b;c"
    const result = parseCsv(csv, ";")
    assert.deepEqual(result, [["a", "b", "c"]])
  })

  it("skips empty lines", () => {
    const csv = "a,b,c\n\n1,2,3"
    const result = parseCsv(csv)
    assert.deepEqual(result, [
      ["a", "b", "c"],
      ["1", "2", "3"],
    ])
  })
})

// =============================================================================
// EXPORT CSV TESTS
// =============================================================================

describe("exportCsv", () => {
  describe("header row", () => {
    it("includes all 14 required columns", () => {
      const csv = exportCsv([], EMPTY_CRITICAL_PATHS)
      const headers = csv.split("\n")[0].split(",")

      assert.equal(headers.length, 14)
      assert.deepEqual(headers, [
        "component_id",
        "type",
        "name",
        "owner",
        "criticality",
        "codeRef",
        "dependencies",
        "healthCheck_endpoint",
        "healthCheck_command",
        "slo_availability",
        "slo_latencyP99",
        "alertChannel",
        "runbook",
        "last_verified",
      ])
    })

    it("uses custom delimiter in header", () => {
      const csv = exportCsv([], EMPTY_CRITICAL_PATHS, { delimiter: ";" })
      const headers = csv.split("\n")[0].split(";")

      assert.equal(headers.length, 14)
      assert.equal(headers[0], "component_id")
    })
  })

  describe("minimal component", () => {
    it("exports component with empty optional fields", () => {
      const component = createMinimalComponent()
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows.length, 2) // header + 1 data row

      const dataRow = rows[1]
      assert.equal(dataRow[0], "lib-test") // component_id
      assert.equal(dataRow[1], "LIB") // type
      assert.equal(dataRow[2], "Test Library") // name
      assert.equal(dataRow[3], "") // owner (null)
      assert.equal(dataRow[4], "MEDIUM") // criticality
      assert.equal(dataRow[5], "") // codeRef (null)
      assert.equal(dataRow[6], "") // dependencies (empty)
      assert.equal(dataRow[7], "") // healthCheck_endpoint (undefined)
      assert.equal(dataRow[8], "") // healthCheck_command (undefined)
      assert.equal(dataRow[9], "") // slo_availability (undefined)
      assert.equal(dataRow[10], "") // slo_latencyP99 (undefined)
      assert.equal(dataRow[11], "") // alertChannel (undefined)
      assert.equal(dataRow[12], "") // runbook (undefined)
      assert.ok(dataRow[13].match(/^\d{4}-\d{2}-\d{2}T/)) // last_verified (ISO date)
    })
  })

  describe("full component", () => {
    it("exports component with all fields populated", () => {
      const component = createFullComponent()
      const lastVerified = new Date("2025-01-15T10:00:00Z")
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS, { lastVerified })
      const rows = parseCsv(csv)

      assert.equal(rows.length, 2)

      const dataRow = rows[1]
      assert.equal(dataRow[0], "lib-auth") // component_id
      assert.equal(dataRow[1], "LIB") // type
      assert.equal(dataRow[2], "Auth Library") // name
      assert.equal(dataRow[3], "team:security") // owner
      assert.equal(dataRow[4], "CRITICAL") // criticality
      assert.equal(dataRow[5], "src/lib/auth/") // codeRef
      assert.equal(dataRow[6], "lib-db,lib-config") // dependencies (comma-separated)
      assert.equal(dataRow[7], "/api/health/auth") // healthCheck_endpoint
      assert.equal(dataRow[8], "") // healthCheck_command (not set)
      assert.equal(dataRow[9], "99.9%") // slo_availability
      assert.equal(dataRow[10], "500ms") // slo_latencyP99
      assert.equal(dataRow[11], "#ops-critical") // alertChannel
      assert.equal(dataRow[12], "docs/runbooks/lib-auth.md") // runbook
      assert.equal(dataRow[13], "2025-01-15T10:00:00.000Z") // last_verified
    })
  })

  describe("dependencies formatting", () => {
    it("formats single dependency", () => {
      const component = createMinimalComponent({
        dependencies: [{ componentId: "lib-db", type: "HARD" }],
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][6], "lib-db")
    })

    it("formats multiple dependencies as comma-separated", () => {
      const component = createMinimalComponent({
        dependencies: [
          { componentId: "lib-db", type: "HARD" },
          { componentId: "lib-config", type: "SOFT" },
          { componentId: "lib-cache", type: "DATA" },
        ],
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      // The dependencies field should be quoted since it contains commas
      assert.equal(rows[1][6], "lib-db,lib-config,lib-cache")
    })

    it("returns empty string for no dependencies", () => {
      const component = createMinimalComponent({
        dependencies: [],
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][6], "")
    })
  })

  describe("health check fields", () => {
    it("exports only endpoint when command is not set", () => {
      const component = createMinimalComponent({
        healthCheck: { endpoint: "/health" },
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][7], "/health") // healthCheck_endpoint
      assert.equal(rows[1][8], "") // healthCheck_command
    })

    it("exports only command when endpoint is not set", () => {
      const component = createMinimalComponent({
        healthCheck: { command: "pg_isready" },
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][7], "") // healthCheck_endpoint
      assert.equal(rows[1][8], "pg_isready") // healthCheck_command
    })

    it("exports both endpoint and command", () => {
      const component = createMinimalComponent({
        healthCheck: {
          endpoint: "/health",
          command: "curl localhost:8080/health",
        },
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][7], "/health")
      assert.equal(rows[1][8], "curl localhost:8080/health")
    })
  })

  describe("SLO fields", () => {
    it("exports availability only", () => {
      const component = createMinimalComponent({
        slo: { availability: "99.9%" },
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][9], "99.9%") // slo_availability
      assert.equal(rows[1][10], "") // slo_latencyP99
    })

    it("exports latencyP99 only", () => {
      const component = createMinimalComponent({
        slo: { latencyP99: "500ms" },
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][9], "") // slo_availability
      assert.equal(rows[1][10], "500ms") // slo_latencyP99
    })

    it("exports both availability and latencyP99", () => {
      const component = createMinimalComponent({
        slo: {
          availability: "99.99%",
          latencyP99: "200ms",
        },
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][9], "99.99%")
      assert.equal(rows[1][10], "200ms")
    })
  })

  describe("special character escaping", () => {
    it("escapes name containing comma", () => {
      const component = createMinimalComponent({
        name: "Auth, Authorization & Security Library",
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][2], "Auth, Authorization & Security Library")
    })

    it("escapes name containing double-quote", () => {
      const component = createMinimalComponent({
        name: 'The "Core" Library',
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows[1][2], 'The "Core" Library')
    })

    it("escapes name containing newline", () => {
      const component = createMinimalComponent({
        name: "Line1\nLine2",
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      // Note: parseCsv with newlines in fields is tricky
      // We verify the raw CSV has proper quoting
      const rawLines = csv.split("\n")
      // Header is line 0, data starts at line 1
      // The quoted field spans multiple "lines" when split by \n
      assert.ok(csv.includes('"Line1\nLine2"'))
    })

    it("escapes owner containing colon", () => {
      const component = createMinimalComponent({
        owner: "team:platform:core",
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      // Colon doesn't need escaping
      assert.equal(rows[1][3], "team:platform:core")
    })

    it("escapes alertChannel with hash", () => {
      const component = createMinimalComponent({
        alertChannel: "#ops-critical",
      })
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      // Hash doesn't need escaping
      assert.equal(rows[1][11], "#ops-critical")
    })
  })

  describe("multiple components", () => {
    it("exports multiple components in order", () => {
      const components = [
        createMinimalComponent({ componentId: "lib-a", name: "Library A" }),
        createMinimalComponent({ componentId: "lib-b", name: "Library B" }),
        createMinimalComponent({ componentId: "lib-c", name: "Library C" }),
      ]
      const csv = exportCsv(components, EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows.length, 4) // header + 3 data rows
      assert.equal(rows[1][0], "lib-a")
      assert.equal(rows[2][0], "lib-b")
      assert.equal(rows[3][0], "lib-c")
    })

    it("handles empty component list", () => {
      const csv = exportCsv([], EMPTY_CRITICAL_PATHS)
      const rows = parseCsv(csv)

      assert.equal(rows.length, 1) // header only
    })
  })

  describe("lastVerified option", () => {
    it("uses provided lastVerified date", () => {
      const component = createMinimalComponent()
      const lastVerified = new Date("2025-01-15T10:00:00Z")
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS, { lastVerified })
      const rows = parseCsv(csv)

      assert.equal(rows[1][13], "2025-01-15T10:00:00.000Z")
    })

    it("uses current time when lastVerified not provided", () => {
      const before = new Date()
      const component = createMinimalComponent()
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
      const after = new Date()
      const rows = parseCsv(csv)

      const lastVerified = new Date(rows[1][13])
      assert.ok(lastVerified >= before)
      assert.ok(lastVerified <= after)
    })

    it("uses same lastVerified for all components", () => {
      const components = [
        createMinimalComponent({ componentId: "lib-a" }),
        createMinimalComponent({ componentId: "lib-b" }),
      ]
      const lastVerified = new Date("2025-01-15T10:00:00Z")
      const csv = exportCsv(components, EMPTY_CRITICAL_PATHS, { lastVerified })
      const rows = parseCsv(csv)

      assert.equal(rows[1][13], rows[2][13])
      assert.equal(rows[1][13], "2025-01-15T10:00:00.000Z")
    })
  })

  describe("custom delimiter", () => {
    it("uses semicolon delimiter", () => {
      const component = createMinimalComponent()
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS, { delimiter: ";" })

      // Header should use semicolons
      const header = csv.split("\n")[0]
      assert.ok(header.includes(";"))
      assert.ok(!header.includes(","))
    })

    it("uses tab delimiter", () => {
      const component = createMinimalComponent()
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS, { delimiter: "\t" })

      // Parse with tab delimiter
      const rows = parseCsv(csv, "\t")
      assert.equal(rows.length, 2)
      assert.equal(rows[1][0], "lib-test")
    })
  })

  describe("expected output format", () => {
    it("matches the expected format from requirements", () => {
      const component: SystemComponent = {
        componentId: "lib-auth",
        type: "LIB",
        name: "Auth Library",
        status: "STABLE",
        criticality: "CRITICAL",
        owner: "team:security",
        docsRef: "docs/auth.md",
        codeRef: "src/lib/auth/",
        dependencies: [
          { componentId: "lib-db", type: "HARD" },
          { componentId: "lib-config", type: "SOFT" },
        ],
        healthCheck: {
          endpoint: "/api/health/auth",
        },
        slo: {},
        alertChannel: "#ops-critical",
        runbook: "docs/runbooks/lib-auth.md",
      }

      const lastVerified = new Date("2025-01-15T10:00:00Z")
      const csv = exportCsv([component], EMPTY_CRITICAL_PATHS, { lastVerified })

      // Parse and verify structure matches requirements
      const rows = parseCsv(csv)

      // Verify header matches expected format
      assert.equal(
        rows[0].join(","),
        "component_id,type,name,owner,criticality,codeRef,dependencies,healthCheck_endpoint,healthCheck_command,slo_availability,slo_latencyP99,alertChannel,runbook,last_verified"
      )

      // Verify data row
      assert.equal(rows[1][0], "lib-auth")
      assert.equal(rows[1][1], "LIB")
      assert.equal(rows[1][2], "Auth Library")
      assert.equal(rows[1][3], "team:security")
      assert.equal(rows[1][4], "CRITICAL")
      assert.equal(rows[1][5], "src/lib/auth/")
      assert.equal(rows[1][6], "lib-db,lib-config")
      assert.equal(rows[1][7], "/api/health/auth")
      assert.equal(rows[1][8], "")
      assert.equal(rows[1][9], "")
      assert.equal(rows[1][10], "")
      assert.equal(rows[1][11], "#ops-critical")
      assert.equal(rows[1][12], "docs/runbooks/lib-auth.md")
      assert.equal(rows[1][13], "2025-01-15T10:00:00.000Z")
    })
  })

  describe("component types", () => {
    const componentTypes = ["UI", "MODULE", "ROUTE_GROUP", "WORKER", "JOB", "QUEUE", "STORE", "INTEGRATION", "LIB"] as const

    for (const type of componentTypes) {
      it(`exports ${type} component type`, () => {
        const component = createMinimalComponent({
          componentId: `${type.toLowerCase()}-test`,
          type,
        })
        const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
        const rows = parseCsv(csv)

        assert.equal(rows[1][1], type)
      })
    }
  })

  describe("criticality levels", () => {
    const criticalityLevels = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const

    for (const criticality of criticalityLevels) {
      it(`exports ${criticality} criticality level`, () => {
        const component = createMinimalComponent({ criticality })
        const csv = exportCsv([component], EMPTY_CRITICAL_PATHS)
        const rows = parseCsv(csv)

        assert.equal(rows[1][4], criticality)
      })
    }
  })
})

// =============================================================================
// ROUNDTRIP TESTS
// =============================================================================

describe("CSV roundtrip", () => {
  it("escaping and parsing are inverse operations for simple values", () => {
    const values = ["hello", "world", "test123", "path/to/file"]

    for (const value of values) {
      const escaped = escapeCsvField(value)
      const csv = `field\n${escaped}`
      const parsed = parseCsv(csv)
      assert.equal(parsed[1][0], value)
    }
  })

  it("escaping and parsing are inverse operations for values with commas", () => {
    const value = "lib-db,lib-config,lib-cache"
    const escaped = escapeCsvField(value)
    const csv = `field\n${escaped}`
    const parsed = parseCsv(csv)

    assert.equal(parsed[1][0], value)
  })

  it("escaping and parsing are inverse operations for values with quotes", () => {
    const value = 'say "hello" to the world'
    const escaped = escapeCsvField(value)
    const csv = `field\n${escaped}`
    const parsed = parseCsv(csv)

    assert.equal(parsed[1][0], value)
  })
})
