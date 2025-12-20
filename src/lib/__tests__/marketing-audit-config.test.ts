import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { getAuditConfig } from "../marketing-audit/config"

describe("Marketing audit config", () => {
  it("uses env overrides when provided", () => {
    const prevFiskai = process.env.FISKAI_ROOT
    const prevNext = process.env.FISKAI_NEXT_ROOT

    process.env.FISKAI_ROOT = "/tmp/FiskAI"
    process.env.FISKAI_NEXT_ROOT = "/tmp/FiskAI-next"

    const cfg = getAuditConfig()

    assert.deepStrictEqual(cfg.repos, ["/tmp/FiskAI", "/tmp/FiskAI-next"])

    if (prevFiskai === undefined) {
      delete process.env.FISKAI_ROOT
    } else {
      process.env.FISKAI_ROOT = prevFiskai
    }

    if (prevNext === undefined) {
      delete process.env.FISKAI_NEXT_ROOT
    } else {
      process.env.FISKAI_NEXT_ROOT = prevNext
    }
  })
})
