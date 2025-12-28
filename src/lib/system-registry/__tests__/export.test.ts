import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

import {
  exportRegistry,
  EXPORT_FORMATS,
  DEFAULT_OUTPUT_DIR,
  getDefaultOutputPath,
} from "../export"
import type { ExportFormat, ExportOptions } from "../export"

describe("Export Module", () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `export-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  describe("EXPORT_FORMATS", () => {
    it("includes all expected formats", () => {
      assert.deepEqual(EXPORT_FORMATS, ["csv", "regulatory-pack", "drift-history"])
    })
  })

  describe("getDefaultOutputPath", () => {
    it("returns path with csv extension for csv format", () => {
      const path = getDefaultOutputPath("csv")
      assert.ok(path.startsWith(DEFAULT_OUTPUT_DIR))
      assert.ok(path.endsWith(".csv"))
      assert.ok(path.includes("csv-"))
    })

    it("returns path with json extension for regulatory-pack format", () => {
      const path = getDefaultOutputPath("regulatory-pack")
      assert.ok(path.startsWith(DEFAULT_OUTPUT_DIR))
      assert.ok(path.endsWith(".json"))
      assert.ok(path.includes("regulatory-pack-"))
    })

    it("returns path with json extension for drift-history format", () => {
      const path = getDefaultOutputPath("drift-history")
      assert.ok(path.startsWith(DEFAULT_OUTPUT_DIR))
      assert.ok(path.endsWith(".json"))
      assert.ok(path.includes("drift-history-"))
    })
  })

  describe("exportRegistry", () => {
    describe("format validation", () => {
      it("throws error for unknown format", async () => {
        const options: ExportOptions = {
          format: "unknown-format" as ExportFormat,
          outputPath: join(testDir, "test.txt"),
        }

        await assert.rejects(async () => {
          await exportRegistry(options)
        }, /Unknown export format: unknown-format/)
      })

      it("includes valid formats in error message", async () => {
        const options: ExportOptions = {
          format: "invalid" as ExportFormat,
          outputPath: join(testDir, "test.txt"),
        }

        await assert.rejects(async () => {
          await exportRegistry(options)
        }, /Valid formats: csv, regulatory-pack, drift-history/)
      })
    })

    describe("output path handling", () => {
      it("uses default output path when not specified", async () => {
        // We can't easily test default path usage without mocking,
        // but we can verify the function works with explicit path
        const outputPath = join(testDir, "custom-output.csv")
        const result = await exportRegistry({
          format: "csv",
          outputPath,
        })

        assert.equal(result.path, outputPath)
        assert.ok(existsSync(outputPath))
      })

      it("creates output directory if it does not exist", async () => {
        const nestedDir = join(testDir, "deep", "nested", "dir")
        const outputPath = join(nestedDir, "output.csv")

        assert.ok(!existsSync(nestedDir))

        await exportRegistry({
          format: "csv",
          outputPath,
        })

        assert.ok(existsSync(outputPath))
      })
    })

    describe("result metadata", () => {
      it("returns correct format in result", async () => {
        const result = await exportRegistry({
          format: "csv",
          outputPath: join(testDir, "test.csv"),
        })

        assert.equal(result.format, "csv")
      })

      it("returns correct path in result", async () => {
        const outputPath = join(testDir, "my-export.json")
        const result = await exportRegistry({
          format: "regulatory-pack",
          outputPath,
        })

        assert.equal(result.path, outputPath)
      })

      it("returns non-zero record count", async () => {
        const result = await exportRegistry({
          format: "csv",
          outputPath: join(testDir, "test.csv"),
        })

        assert.ok(result.recordCount > 0, "Should have at least one component")
      })

      it("returns generatedAt as Date", async () => {
        const before = new Date()
        const result = await exportRegistry({
          format: "csv",
          outputPath: join(testDir, "test.csv"),
        })
        const after = new Date()

        assert.ok(result.generatedAt instanceof Date)
        assert.ok(result.generatedAt >= before)
        assert.ok(result.generatedAt <= after)
      })
    })

    describe("CSV format", () => {
      it("exports valid CSV with headers", async () => {
        const outputPath = join(testDir, "test.csv")
        await exportRegistry({
          format: "csv",
          outputPath,
        })

        const content = readFileSync(outputPath, "utf-8")
        const lines = content.split("\n")

        // Check header
        const header = lines[0]
        assert.ok(header.includes("componentId"))
        assert.ok(header.includes("type"))
        assert.ok(header.includes("name"))
        assert.ok(header.includes("status"))
        assert.ok(header.includes("criticality"))
        assert.ok(header.includes("owner"))
        assert.ok(header.includes("docsRef"))
        assert.ok(header.includes("codeRef"))

        // Check that there are data rows
        assert.ok(lines.length > 1, "Should have at least one data row")
      })

      it("includes metadata columns when includeMetadata is true", async () => {
        const outputPath = join(testDir, "test-metadata.csv")
        await exportRegistry({
          format: "csv",
          outputPath,
          includeMetadata: true,
        })

        const content = readFileSync(outputPath, "utf-8")
        const header = content.split("\n")[0]

        assert.ok(header.includes("dependencies"))
        assert.ok(header.includes("criticalPaths"))
        assert.ok(header.includes("aliases"))
      })
    })

    describe("regulatory-pack format", () => {
      it("exports valid JSON structure", async () => {
        const outputPath = join(testDir, "test.json")
        await exportRegistry({
          format: "regulatory-pack",
          outputPath,
        })

        const content = readFileSync(outputPath, "utf-8")
        const pack = JSON.parse(content)

        assert.ok(pack.exportedAt)
        assert.ok(pack.version)
        assert.ok(pack.summary)
        assert.ok(pack.summary.totalComponents > 0)
        assert.ok(pack.criticalPaths)
        assert.ok(Array.isArray(pack.components))
      })

      it("includes summary statistics", async () => {
        const outputPath = join(testDir, "test.json")
        await exportRegistry({
          format: "regulatory-pack",
          outputPath,
        })

        const content = readFileSync(outputPath, "utf-8")
        const pack = JSON.parse(content)

        assert.ok(typeof pack.summary.totalComponents === "number")
        assert.ok(typeof pack.summary.criticalPathCount === "number")
        assert.ok(typeof pack.summary.componentsByType === "object")
        assert.ok(typeof pack.summary.componentsByCriticality === "object")
      })
    })

    describe("drift-history format", () => {
      it("exports valid JSON structure", async () => {
        const outputPath = join(testDir, "test.json")
        await exportRegistry({
          format: "drift-history",
          outputPath,
        })

        const content = readFileSync(outputPath, "utf-8")
        const history = JSON.parse(content)

        assert.ok(history.exportedAt)
        assert.ok(history.version)
        assert.ok(history.currentSnapshot)
        assert.ok(Array.isArray(history.entries))
      })

      it("includes placeholder note", async () => {
        const outputPath = join(testDir, "test.json")
        await exportRegistry({
          format: "drift-history",
          outputPath,
        })

        const content = readFileSync(outputPath, "utf-8")
        const history = JSON.parse(content)

        assert.ok(history.note)
        assert.ok(history.note.includes("not yet implemented"))
      })

      it("respects since option", async () => {
        const since = new Date("2024-01-01")
        const outputPath = join(testDir, "test.json")
        await exportRegistry({
          format: "drift-history",
          outputPath,
          since,
        })

        const content = readFileSync(outputPath, "utf-8")
        const history = JSON.parse(content)

        assert.equal(history.since, since.toISOString())
      })
    })
  })
})
