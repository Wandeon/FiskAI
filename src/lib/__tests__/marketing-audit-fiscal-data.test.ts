import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { loadFiscalDataMap } from "../marketing-audit/fiscal-data-map"

describe("Marketing audit fiscal data map", () => {
  it("loads fiscal data exports", async () => {
    const map = await loadFiscalDataMap()

    assert.ok(Object.keys(map).length > 0)
    assert.ok("TAX_RATES" in map)
    assert.ok("THRESHOLDS" in map)
  })
})
