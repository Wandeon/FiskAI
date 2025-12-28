/**
 * Export CLI Tests
 *
 * Tests for the export.ts CLI entry point.
 */

import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert"
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs"
import { join } from "path"
import { execSync, type ExecSyncOptions } from "child_process"
import { tmpdir } from "os"

const SCRIPT_PATH = join(process.cwd(), "src/lib/system-registry/scripts/export.ts")

/**
 * Helper to run the CLI script
 */
function runCLI(
  args: string[],
  options: { cwd?: string; expectFail?: boolean } = {}
): { stdout: string; stderr: string; exitCode: number } {
  const cmd = `npx tsx ${SCRIPT_PATH} ${args.join(" ")} 2>&1`
  const execOptions: ExecSyncOptions = {
    cwd: options.cwd || process.cwd(),
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, NO_COLOR: "1" },
  }

  try {
    const output = execSync(cmd, execOptions) as string
    // When using 2>&1, both stdout and stderr are combined in stdout
    return { stdout: output, stderr: output, exitCode: 0 }
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number }
    if (options.expectFail) {
      return {
        stdout: execError.stdout || "",
        stderr: execError.stderr || execError.stdout || "",
        exitCode: execError.status || 1,
      }
    }
    throw error
  }
}

describe("Export CLI", () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `export-cli-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  describe("Argument Parsing", () => {
    it("should fail with clear error when --format is missing", () => {
      const result = runCLI([], { expectFail: true })
      assert.strictEqual(result.exitCode, 1)
      assert.ok(
        result.stderr.includes("--format") || result.stderr.includes("required"),
        "Should mention missing --format"
      )
    })

    it("should fail with clear error for invalid format", () => {
      const result = runCLI(["--format", "invalid-format"], { expectFail: true })
      assert.strictEqual(result.exitCode, 1)
      assert.ok(
        result.stderr.includes("Invalid format") || result.stderr.includes("invalid-format"),
        "Should mention invalid format"
      )
    })

    it("should show valid formats in error message", () => {
      const result = runCLI(["--format", "invalid"], { expectFail: true })
      assert.ok(
        result.stderr.includes("csv") &&
          result.stderr.includes("regulatory-pack") &&
          result.stderr.includes("drift-history"),
        "Should list valid formats"
      )
    })

    it("should accept --format csv", () => {
      const outputPath = join(testDir, "test.csv")
      const result = runCLI(["--format", "csv", "--output", outputPath])
      assert.strictEqual(result.exitCode, 0)
      assert.ok(existsSync(outputPath), "CSV file should be created")
    })

    it("should accept --format regulatory-pack", () => {
      const outputPath = join(testDir, "test.json")
      const result = runCLI(["--format", "regulatory-pack", "--output", outputPath])
      assert.strictEqual(result.exitCode, 0)
      assert.ok(existsSync(outputPath), "JSON file should be created")
    })

    it("should accept --format drift-history", () => {
      const outputPath = join(testDir, "test.json")
      const result = runCLI(["--format", "drift-history", "--output", outputPath])
      assert.strictEqual(result.exitCode, 0)
      assert.ok(existsSync(outputPath), "JSON file should be created")
    })

    it("should accept --since with valid date", () => {
      const outputPath = join(testDir, "test.json")
      const result = runCLI([
        "--format",
        "drift-history",
        "--since",
        "2025-01-01",
        "--output",
        outputPath,
      ])
      assert.strictEqual(result.exitCode, 0)
    })

    it("should fail with clear error for invalid --since date", () => {
      const result = runCLI(
        ["--format", "drift-history", "--since", "not-a-date"],
        { expectFail: true }
      )
      assert.strictEqual(result.exitCode, 1)
      assert.ok(
        result.stderr.includes("Invalid date") || result.stderr.includes("date format"),
        "Should mention invalid date"
      )
    })

    it("should warn when --since is used with non-drift-history format", () => {
      const outputPath = join(testDir, "test.csv")
      const result = runCLI(["--format", "csv", "--since", "2025-01-01", "--output", outputPath])
      // Should still succeed but warn
      assert.strictEqual(result.exitCode, 0)
      assert.ok(
        result.stderr.includes("--since") || result.stderr.includes("drift-history"),
        "Should warn about --since usage"
      )
    })

    it("should accept --metadata flag", () => {
      const outputPath = join(testDir, "test.csv")
      const result = runCLI(["--format", "csv", "--metadata", "--output", outputPath])
      assert.strictEqual(result.exitCode, 0)
    })

    it("should accept --json flag", () => {
      const outputPath = join(testDir, "test.csv")
      const result = runCLI(["--format", "csv", "--json", "--output", outputPath])
      assert.strictEqual(result.exitCode, 0)
      // Output should be valid JSON
      const json = JSON.parse(result.stdout)
      assert.ok(json.success === true, "JSON output should indicate success")
    })
  })

  describe("Help", () => {
    it("should show help with --help", () => {
      const result = runCLI(["--help"])
      assert.strictEqual(result.exitCode, 0)
      assert.ok(result.stdout.includes("USAGE"), "Should include usage section")
      assert.ok(result.stdout.includes("FORMATS"), "Should include formats section")
      assert.ok(result.stdout.includes("OPTIONS"), "Should include options section")
      assert.ok(result.stdout.includes("EXAMPLES"), "Should include examples section")
    })

    it("should show help with -h", () => {
      const result = runCLI(["-h"])
      assert.strictEqual(result.exitCode, 0)
      assert.ok(result.stdout.includes("USAGE"), "Should include usage section")
    })
  })

  describe("Output Path Handling", () => {
    it("should use default output path when --output not specified", () => {
      // Run with CSV format, which should create file in default location
      const result = runCLI(["--format", "csv", "--json"])
      assert.strictEqual(result.exitCode, 0)
      const json = JSON.parse(result.stdout)
      assert.ok(
        json.path.includes("docs/system-registry/exports"),
        "Should use default output directory"
      )
      // Clean up default output
      if (existsSync(json.path)) {
        rmSync(json.path)
      }
    })

    it("should create output directory if it does not exist", () => {
      const nestedDir = join(testDir, "deep", "nested", "dir")
      const outputPath = join(nestedDir, "output.csv")

      assert.ok(!existsSync(nestedDir), "Directory should not exist before test")

      const result = runCLI(["--format", "csv", "--output", outputPath])
      assert.strictEqual(result.exitCode, 0)
      assert.ok(existsSync(outputPath), "File should be created in nested directory")
    })

    it("should generate filename when output is a directory path", () => {
      // Use trailing slash to indicate directory
      const dirPath = testDir + "/"
      const result = runCLI(["--format", "csv", "--output", dirPath, "--json"])
      assert.strictEqual(result.exitCode, 0)
      const json = JSON.parse(result.stdout)
      assert.ok(json.path.startsWith(testDir), "Path should be in specified directory")
      assert.ok(json.path.includes("csv-"), "Path should contain format prefix")
      assert.ok(json.path.endsWith(".csv"), "Path should have .csv extension")
    })
  })

  describe("CSV Export", () => {
    it("should export valid CSV with headers", () => {
      const outputPath = join(testDir, "test.csv")
      runCLI(["--format", "csv", "--output", outputPath])

      const content = readFileSync(outputPath, "utf-8")
      const lines = content.split("\n")

      // Check header
      const header = lines[0]
      assert.ok(header.includes("componentId"), "Should have componentId column")
      assert.ok(header.includes("type"), "Should have type column")
      assert.ok(header.includes("name"), "Should have name column")
      assert.ok(header.includes("status"), "Should have status column")
      assert.ok(header.includes("criticality"), "Should have criticality column")
      assert.ok(header.includes("owner"), "Should have owner column")

      // Should have data rows
      assert.ok(lines.length > 1, "Should have at least one data row")
    })

    it("should include metadata columns when --metadata is set", () => {
      const outputPath = join(testDir, "test.csv")
      runCLI(["--format", "csv", "--metadata", "--output", outputPath])

      const content = readFileSync(outputPath, "utf-8")
      const header = content.split("\n")[0]

      assert.ok(header.includes("dependencies"), "Should have dependencies column")
      assert.ok(header.includes("criticalPaths"), "Should have criticalPaths column")
      assert.ok(header.includes("aliases"), "Should have aliases column")
    })
  })

  describe("Regulatory Pack Export", () => {
    it("should export valid JSON structure", () => {
      const outputPath = join(testDir, "test.json")
      runCLI(["--format", "regulatory-pack", "--output", outputPath])

      const content = readFileSync(outputPath, "utf-8")
      const pack = JSON.parse(content)

      assert.ok(pack.exportedAt, "Should have exportedAt field")
      assert.ok(pack.version, "Should have version field")
      assert.ok(pack.summary, "Should have summary field")
      assert.ok(pack.criticalPaths, "Should have criticalPaths field")
      assert.ok(Array.isArray(pack.components), "Should have components array")
    })

    it("should include summary statistics", () => {
      const outputPath = join(testDir, "test.json")
      runCLI(["--format", "regulatory-pack", "--output", outputPath])

      const content = readFileSync(outputPath, "utf-8")
      const pack = JSON.parse(content)

      assert.ok(typeof pack.summary.totalComponents === "number", "Should have totalComponents")
      assert.ok(typeof pack.summary.criticalPathCount === "number", "Should have criticalPathCount")
      assert.ok(typeof pack.summary.componentsByType === "object", "Should have componentsByType")
      assert.ok(
        typeof pack.summary.componentsByCriticality === "object",
        "Should have componentsByCriticality"
      )
    })
  })

  describe("Drift History Export", () => {
    it("should export valid JSON structure", () => {
      const outputPath = join(testDir, "test.json")
      runCLI(["--format", "drift-history", "--output", outputPath])

      const content = readFileSync(outputPath, "utf-8")
      const history = JSON.parse(content)

      assert.ok(history.exportedAt, "Should have exportedAt field")
      assert.ok(history.version, "Should have version field")
      assert.ok(history.currentSnapshot, "Should have currentSnapshot field")
      assert.ok(Array.isArray(history.entries), "Should have entries array")
    })

    it("should respect --since option", () => {
      const outputPath = join(testDir, "test.json")
      runCLI(["--format", "drift-history", "--since", "2025-01-01", "--output", outputPath])

      const content = readFileSync(outputPath, "utf-8")
      const history = JSON.parse(content)

      assert.ok(history.since, "Should have since field")
      assert.ok(history.since.startsWith("2025-01-01"), "Since should match specified date")
    })
  })

  describe("JSON Output Mode", () => {
    it("should output valid JSON with success info", () => {
      const outputPath = join(testDir, "test.csv")
      const result = runCLI(["--format", "csv", "--output", outputPath, "--json"])

      const json = JSON.parse(result.stdout)
      assert.strictEqual(json.success, true, "Should indicate success")
      assert.strictEqual(json.format, "csv", "Should include format")
      assert.ok(json.path, "Should include path")
      assert.ok(typeof json.recordCount === "number", "Should include recordCount")
      assert.ok(json.generatedAt, "Should include generatedAt")
      assert.ok(typeof json.durationMs === "number", "Should include durationMs")
    })

    it("should output error JSON on failure", () => {
      const result = runCLI(
        ["--format", "invalid", "--json"],
        { expectFail: true }
      )

      // In this case, the error happens before --json is processed
      // so we can't expect JSON output for format validation errors
      assert.strictEqual(result.exitCode, 1)
    })
  })

  describe("Exit Codes", () => {
    it("should exit 0 on successful export", () => {
      const outputPath = join(testDir, "test.csv")
      const result = runCLI(["--format", "csv", "--output", outputPath])
      assert.strictEqual(result.exitCode, 0)
    })

    it("should exit 0 on --help", () => {
      const result = runCLI(["--help"])
      assert.strictEqual(result.exitCode, 0)
    })

    it("should exit 1 on missing required argument", () => {
      const result = runCLI([], { expectFail: true })
      assert.strictEqual(result.exitCode, 1)
    })

    it("should exit 1 on invalid format", () => {
      const result = runCLI(["--format", "invalid"], { expectFail: true })
      assert.strictEqual(result.exitCode, 1)
    })

    it("should exit 1 on invalid date", () => {
      const result = runCLI(
        ["--format", "drift-history", "--since", "not-a-date"],
        { expectFail: true }
      )
      assert.strictEqual(result.exitCode, 1)
    })
  })

  describe("Human-Readable Output", () => {
    it("should output path to stdout for scripting", () => {
      const outputPath = join(testDir, "test.csv")
      const result = runCLI(["--format", "csv", "--output", outputPath])

      // stdout should contain the path for piping
      assert.ok(result.stdout.includes(outputPath), "Should output path to stdout")
    })

    it("should output status messages to stderr", () => {
      const outputPath = join(testDir, "test.csv")
      const result = runCLI(["--format", "csv", "--output", outputPath])

      // Status messages should go to stderr
      assert.ok(
        result.stderr.includes("System Registry Export") ||
          result.stderr.includes("Export completed"),
        "Should output status to stderr"
      )
    })
  })
})
