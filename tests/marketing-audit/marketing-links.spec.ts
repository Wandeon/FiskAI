import { test, expect } from "@playwright/test"
import axe from "axe-core"
import { getAuditConfig } from "../../src/lib/marketing-audit/config"
import { buildRouteInventory } from "../../src/lib/marketing-audit/route-inventory"

const skipSchemes = ["mailto:", "tel:", "javascript:"]
const skipExtensions = [".pdf", ".zip", ".rar"]

async function loadRoutes() {
  const config = getAuditConfig()
  const routes = [] as Array<{ route: string }>

  for (const repo of config.repos) {
    const repoRoutes = await buildRouteInventory(repo, config.marketingRoot)
    routes.push(...repoRoutes)
  }

  const unique = new Map<string, string>()
  for (const route of routes) {
    if (!unique.has(route.route)) {
      unique.set(route.route, route.file)
    }
  }

  return {
    config,
    routes: Array.from(unique.keys()).sort(),
  }
}

function normalizeLink(baseUrl: string, href: string) {
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith("#")) {
    return null
  }

  if (skipSchemes.some((scheme) => trimmed.startsWith(scheme))) {
    return null
  }

  if (skipExtensions.some((ext) => trimmed.toLowerCase().endsWith(ext))) {
    return null
  }

  try {
    return new URL(trimmed, baseUrl).toString()
  } catch {
    return null
  }
}

test("marketing routes and links respond", async ({ page, request }) => {
  const { config, routes } = await loadRoutes()
  const baseUrl = config.targetBaseUrl.endsWith("/")
    ? config.targetBaseUrl
    : `${config.targetBaseUrl}/`

  for (const route of routes) {
    const url = new URL(route.replace(/^\/+/, ""), baseUrl).toString()
    const response = await page.goto(url, { waitUntil: "networkidle" })

    expect.soft(response?.status(), `Route ${url} should respond`).toBeLessThan(400)

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a[href]")).map((link) => ({
        href: link.getAttribute("href") ?? "",
        text: link.textContent?.trim() ?? "",
        ariaLabel: link.getAttribute("aria-label") ?? "",
      }))
    })

    const visitedLinks = new Set<string>()

    for (const link of links) {
      const normalized = normalizeLink(baseUrl, link.href)
      if (!normalized || visitedLinks.has(normalized)) {
        continue
      }

      visitedLinks.add(normalized)
      const linkResponse = await request.get(normalized, { failOnStatusCode: false })
      const status = linkResponse.status()

      expect.soft(
        status,
        `Link ${normalized} should respond (found on ${url}).`,
      ).toBeLessThan(400)
    }

    await page.addScriptTag({ content: axe.source })
    const axeResults = await page.evaluate(async () => {
      return await (window as typeof window & { axe: typeof axe }).axe.run(document, {
        runOnly: {
          type: "rule",
          values: ["color-contrast"],
        },
      })
    })

    expect.soft(
      axeResults.violations.length,
      `Contrast issues on ${url}: ${axeResults.violations
        .map((violation) => violation.id)
        .join(", ")}`,
    ).toBe(0)
  }
})
