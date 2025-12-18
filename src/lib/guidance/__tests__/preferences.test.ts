// src/lib/guidance/__tests__/preferences.test.ts
import { describe, it, beforeEach, mock } from "node:test"
import assert from "node:assert"
import {
  COMPETENCE_LEVELS,
  GUIDANCE_CATEGORIES,
  getEffectiveLevel,
  shouldShowGuidance,
  getNotificationDays,
  LEVEL_LABELS,
} from "../preferences"

describe("Guidance Preferences", () => {
  describe("getEffectiveLevel", () => {
    it("returns category-specific level when no global override", () => {
      const prefs = {
        id: "1",
        userId: "user1",
        levelFakturiranje: "pro",
        levelFinancije: "beginner",
        levelEu: "average",
        globalLevel: null,
        emailDigest: "weekly",
        pushEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      assert.strictEqual(getEffectiveLevel(prefs, "fakturiranje"), "pro")
      assert.strictEqual(getEffectiveLevel(prefs, "financije"), "beginner")
      assert.strictEqual(getEffectiveLevel(prefs, "eu"), "average")
    })

    it("returns global level when set", () => {
      const prefs = {
        id: "1",
        userId: "user1",
        levelFakturiranje: "pro",
        levelFinancije: "beginner",
        levelEu: "average",
        globalLevel: "average",
        emailDigest: "weekly",
        pushEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      assert.strictEqual(getEffectiveLevel(prefs, "fakturiranje"), "average")
      assert.strictEqual(getEffectiveLevel(prefs, "financije"), "average")
      assert.strictEqual(getEffectiveLevel(prefs, "eu"), "average")
    })
  })

  describe("shouldShowGuidance", () => {
    const makePrefs = (level: string) => ({
      id: "1",
      userId: "user1",
      levelFakturiranje: level,
      levelFinancije: level,
      levelEu: level,
      globalLevel: null,
      emailDigest: "weekly",
      pushEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    it("beginners see all guidance types", () => {
      const prefs = makePrefs("beginner")
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "tooltip"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "wizard"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "notification"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "detailed_help"), true)
    })

    it("average users don't see constant tooltips", () => {
      const prefs = makePrefs("average")
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "tooltip"), false)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "wizard"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "notification"), true)
    })

    it("pro users only see notifications", () => {
      const prefs = makePrefs("pro")
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "tooltip"), false)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "wizard"), false)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "notification"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "detailed_help"), false)
    })
  })

  describe("getNotificationDays", () => {
    it("beginners get all reminder days", () => {
      const days = getNotificationDays("beginner")
      assert.deepStrictEqual(days, [7, 3, 1, 0])
    })

    it("average users get fewer reminders", () => {
      const days = getNotificationDays("average")
      assert.deepStrictEqual(days, [3, 1, 0])
    })

    it("pro users get minimal reminders", () => {
      const days = getNotificationDays("pro")
      assert.deepStrictEqual(days, [1, 0])
    })
  })

  describe("constants", () => {
    it("has all competence levels", () => {
      assert.strictEqual(COMPETENCE_LEVELS.BEGINNER, "beginner")
      assert.strictEqual(COMPETENCE_LEVELS.AVERAGE, "average")
      assert.strictEqual(COMPETENCE_LEVELS.PRO, "pro")
    })

    it("has all guidance categories", () => {
      assert.strictEqual(GUIDANCE_CATEGORIES.FAKTURIRANJE, "fakturiranje")
      assert.strictEqual(GUIDANCE_CATEGORIES.FINANCIJE, "financije")
      assert.strictEqual(GUIDANCE_CATEGORIES.EU, "eu")
    })

    it("has Croatian labels for all levels", () => {
      assert.strictEqual(LEVEL_LABELS.beginner, "Početnik")
      assert.strictEqual(LEVEL_LABELS.average, "Srednji")
      assert.strictEqual(LEVEL_LABELS.pro, "Profesionalac")
    })
  })
})
