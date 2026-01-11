import { describe, it, expect } from "vitest"
import { adminRoute, adminTenantRoute, adminRegulatoryRoute } from "../routes"

describe("adminRoute", () => {
  it("prefixes paths with /admin", () => {
    expect(adminRoute("/tenants")).toBe("/admin/tenants")
    expect(adminRoute("/alerts")).toBe("/admin/alerts")
    expect(adminRoute("/overview")).toBe("/admin/overview")
  })

  it("handles paths without leading slash", () => {
    expect(adminRoute("tenants")).toBe("/admin/tenants")
    expect(adminRoute("alerts")).toBe("/admin/alerts")
  })

  it("preserves query strings", () => {
    expect(adminRoute("/tenants?sortField=createdAt&sortOrder=desc")).toBe(
      "/admin/tenants?sortField=createdAt&sortOrder=desc"
    )
    expect(adminRoute("/alerts?level=critical")).toBe("/admin/alerts?level=critical")
  })

  it("avoids double /admin prefix", () => {
    expect(adminRoute("/admin/tenants")).toBe("/admin/tenants")
    expect(adminRoute("/admin/alerts?level=critical")).toBe("/admin/alerts?level=critical")
  })

  it("handles root path", () => {
    expect(adminRoute("/")).toBe("/admin/")
  })
})

describe("adminTenantRoute", () => {
  it("generates correct tenant detail routes", () => {
    expect(adminTenantRoute("abc-123")).toBe("/admin/tenants/abc-123")
    expect(adminTenantRoute("tenant-uuid-here")).toBe("/admin/tenants/tenant-uuid-here")
  })

  it("handles UUIDs with special characters", () => {
    expect(adminTenantRoute("cm1abc2def3")).toBe("/admin/tenants/cm1abc2def3")
  })
})

describe("adminRegulatoryRoute", () => {
  it("generates correct regulatory sub-routes", () => {
    expect(adminRegulatoryRoute("/sentinel")).toBe("/admin/regulatory/sentinel")
    expect(adminRegulatoryRoute("/sources")).toBe("/admin/regulatory/sources")
    expect(adminRegulatoryRoute("/inbox")).toBe("/admin/regulatory/inbox")
    expect(adminRegulatoryRoute("/conflicts")).toBe("/admin/regulatory/conflicts")
    expect(adminRegulatoryRoute("/releases")).toBe("/admin/regulatory/releases")
  })

  it("handles paths without leading slash", () => {
    expect(adminRegulatoryRoute("sentinel")).toBe("/admin/regulatory/sentinel")
    expect(adminRegulatoryRoute("sources")).toBe("/admin/regulatory/sources")
  })
})
