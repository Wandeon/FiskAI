import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { seedRegistry } from "../marketing-audit/registry"

describe("Marketing audit registry", () => {
  it("seed includes routes", () => {
    const registry = seedRegistry([{ route: "/about", file: "/tmp/about/page.tsx" }])

    assert.deepStrictEqual(registry.pages[0], {
      route: "/about",
      file: "/tmp/about/page.tsx",
      ctas: [],
      dataDependencies: [],
      toolChecks: [],
      notes: "",
    })
  })
})
