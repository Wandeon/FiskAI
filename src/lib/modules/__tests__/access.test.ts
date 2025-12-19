import { describe, it, expect } from "vitest"
import { createModuleAccess } from "../access"
import { DEFAULT_ENTITLEMENTS } from "../definitions"

describe("createModuleAccess", () => {
  describe("hasModule", () => {
    it("returns true for enabled modules", () => {
      const access = createModuleAccess(["invoicing", "expenses"])
      expect(access.hasModule("invoicing")).toBe(true)
      expect(access.hasModule("expenses")).toBe(true)
    })

    it("returns false for disabled modules", () => {
      const access = createModuleAccess(["invoicing"])
      expect(access.hasModule("banking")).toBe(false)
      expect(access.hasModule("pos")).toBe(false)
    })
  })

  describe("canAccessRoute", () => {
    it("allows access to routes for enabled modules", () => {
      const access = createModuleAccess(["invoicing", "expenses"])
      expect(access.canAccessRoute("/invoices")).toBe(true)
      expect(access.canAccessRoute("/invoices/new")).toBe(true)
      expect(access.canAccessRoute("/expenses")).toBe(true)
    })

    it("denies access to routes for disabled modules", () => {
      const access = createModuleAccess(["invoicing"])
      expect(access.canAccessRoute("/banking")).toBe(false)
      expect(access.canAccessRoute("/pos")).toBe(false)
    })

    it("allows access to routes not belonging to any module", () => {
      const access = createModuleAccess([])
      expect(access.canAccessRoute("/settings")).toBe(true)
      expect(access.canAccessRoute("/support")).toBe(true)
      expect(access.canAccessRoute("/dashboard")).toBe(true)
    })
  })

  describe("getModuleForRoute", () => {
    it("returns correct module for route", () => {
      const access = createModuleAccess(DEFAULT_ENTITLEMENTS)
      expect(access.getModuleForRoute("/invoices")).toBe("invoicing")
      expect(access.getModuleForRoute("/expenses/categories")).toBe("expenses")
      expect(access.getModuleForRoute("/pausalni/forms")).toBe("pausalni")
    })

    it("returns null for routes not in any module", () => {
      const access = createModuleAccess(DEFAULT_ENTITLEMENTS)
      expect(access.getModuleForRoute("/settings")).toBeNull()
      expect(access.getModuleForRoute("/support")).toBeNull()
    })
  })
})
