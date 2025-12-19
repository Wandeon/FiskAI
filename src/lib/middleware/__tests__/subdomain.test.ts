import { describe, it, expect } from "vitest"
import { getSubdomain, getRouteGroupForSubdomain, getRedirectUrlForSystemRole } from "../subdomain"

describe("getSubdomain", () => {
  it("returns app for app.fiskai.eu", () => {
    expect(getSubdomain("app.fiskai.eu")).toBe("app")
  })

  it("returns staff for staff.fiskai.eu", () => {
    expect(getSubdomain("staff.fiskai.eu")).toBe("staff")
  })

  it("returns admin for admin.fiskai.eu", () => {
    expect(getSubdomain("admin.fiskai.eu")).toBe("admin")
  })

  it("returns marketing for fiskai.eu (root domain)", () => {
    expect(getSubdomain("fiskai.eu")).toBe("marketing")
  })

  it("returns marketing for www.fiskai.eu", () => {
    expect(getSubdomain("www.fiskai.eu")).toBe("marketing")
  })

  it("handles port in hostname", () => {
    expect(getSubdomain("app.fiskai.eu:3000")).toBe("app")
  })

  it("returns app for localhost (development default)", () => {
    expect(getSubdomain("localhost")).toBe("app")
    expect(getSubdomain("localhost:3000")).toBe("app")
  })
})

describe("getRouteGroupForSubdomain", () => {
  it("maps subdomains to route groups", () => {
    expect(getRouteGroupForSubdomain("admin")).toBe("(admin)")
    expect(getRouteGroupForSubdomain("staff")).toBe("(staff)")
    expect(getRouteGroupForSubdomain("app")).toBe("(app)")
    expect(getRouteGroupForSubdomain("marketing")).toBe("(marketing)")
  })
})

describe("getRedirectUrlForSystemRole", () => {
  it("redirects ADMIN to admin subdomain", () => {
    const result = getRedirectUrlForSystemRole("ADMIN", "https://app.fiskai.eu/dashboard")
    expect(result).toBe("https://admin.fiskai.eu")
  })

  it("redirects STAFF to staff subdomain", () => {
    const result = getRedirectUrlForSystemRole("STAFF", "https://admin.fiskai.eu")
    expect(result).toBe("https://staff.fiskai.eu")
  })

  it("redirects USER to app subdomain", () => {
    const result = getRedirectUrlForSystemRole("USER", "https://staff.fiskai.eu")
    expect(result).toBe("https://app.fiskai.eu")
  })
})
