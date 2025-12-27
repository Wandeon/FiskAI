import { describe, it, expect } from "vitest"
import { updateVelocity, describeVelocity } from "../velocity-profiler"

describe("updateVelocity", () => {
  describe("warmup period", () => {
    it("stays at 0.5 during first 3 scans regardless of change", () => {
      expect(updateVelocity(0.5, 0, true).newFrequency).toBe(0.5)
      expect(updateVelocity(0.5, 1, false).newFrequency).toBe(0.5)
      expect(updateVelocity(0.5, 2, true).newFrequency).toBe(0.5)
    })

    it("sets lastChangedAt only when content changed", () => {
      const changed = updateVelocity(0.5, 0, true)
      expect(changed.lastChangedAt).toBeInstanceOf(Date)

      const unchanged = updateVelocity(0.5, 1, false)
      expect(unchanged.lastChangedAt).toBeNull()
    })
  })

  describe("post-warmup EWMA", () => {
    it("increases velocity when content changes", () => {
      const result = updateVelocity(0.5, 5, true)
      // EWMA: 0.3 * 1.0 + 0.7 * 0.5 = 0.3 + 0.35 = 0.65
      expect(result.newFrequency).toBeCloseTo(0.65, 2)
    })

    it("decreases velocity when content is stable", () => {
      const result = updateVelocity(0.5, 5, false)
      // EWMA: 0.1 * 0.0 + 0.9 * 0.5 = 0.45
      expect(result.newFrequency).toBeCloseTo(0.45, 2)
    })

    it("spikes quickly on change (alpha=0.3)", () => {
      const result = updateVelocity(0.1, 5, true)
      // EWMA: 0.3 * 1.0 + 0.7 * 0.1 = 0.37
      expect(result.newFrequency).toBeCloseTo(0.37, 2)
    })

    it("decays slowly on stability (alpha=0.1)", () => {
      const result = updateVelocity(0.8, 5, false)
      // EWMA: 0.1 * 0.0 + 0.9 * 0.8 = 0.72
      expect(result.newFrequency).toBeCloseTo(0.72, 2)
    })
  })

  describe("clamping", () => {
    it("clamps to minimum 0.01", () => {
      // After many stable scans from low value
      let freq = 0.05
      for (let i = 0; i < 20; i++) {
        freq = updateVelocity(freq, 10, false).newFrequency
      }
      expect(freq).toBeGreaterThanOrEqual(0.01)
    })

    it("clamps to maximum 0.99", () => {
      // After many changes from high value
      let freq = 0.95
      for (let i = 0; i < 20; i++) {
        freq = updateVelocity(freq, 10, true).newFrequency
      }
      expect(freq).toBeLessThanOrEqual(0.99)
    })
  })
})

describe("describeVelocity", () => {
  it("describes 0.9 as volatile", () => {
    expect(describeVelocity(0.9)).toBe("volatile")
  })

  it("describes 0.6 as active", () => {
    expect(describeVelocity(0.6)).toBe("active")
  })

  it("describes 0.3 as moderate", () => {
    expect(describeVelocity(0.3)).toBe("moderate")
  })

  it("describes 0.1 as static", () => {
    expect(describeVelocity(0.1)).toBe("static")
  })
})
