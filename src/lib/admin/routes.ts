/**
 * Admin Route Helper
 *
 * Single source of truth for admin portal internal navigation.
 * Ensures all internal links correctly include the /admin prefix.
 *
 * Usage:
 *   import { adminRoute } from "@/lib/admin/routes"
 *   <Link href={adminRoute("/tenants")}>Tenants</Link>
 *   // => "/admin/tenants"
 */

const ADMIN_PREFIX = "/admin"

/**
 * Generate an admin portal internal route.
 * Ensures all paths are correctly prefixed with /admin.
 *
 * @param path - The path within admin (e.g., "/tenants", "/alerts?level=critical")
 * @returns Full admin route (e.g., "/admin/tenants", "/admin/alerts?level=critical")
 *
 * @example
 * adminRoute("/tenants") // "/admin/tenants"
 * adminRoute("/tenants/abc-123") // "/admin/tenants/abc-123"
 * adminRoute("/alerts?level=critical") // "/admin/alerts?level=critical"
 * adminRoute("tenants") // "/admin/tenants" (adds leading slash)
 */
export function adminRoute(path: string): string {
  // Normalize: ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  // Avoid double prefix if path already starts with /admin
  if (normalizedPath.startsWith(ADMIN_PREFIX)) {
    return normalizedPath
  }

  return `${ADMIN_PREFIX}${normalizedPath}`
}

/**
 * Generate an admin tenant detail route.
 *
 * @param tenantId - The tenant/company ID
 * @returns Route to tenant detail page
 */
export function adminTenantRoute(tenantId: string): string {
  return adminRoute(`/tenants/${tenantId}`)
}

/**
 * Generate an admin regulatory sub-route.
 *
 * @param subPath - Path within regulatory (e.g., "/sentinel", "/rules", "/inbox")
 * @returns Full admin regulatory route
 */
export function adminRegulatoryRoute(subPath: string): string {
  const normalizedSubPath = subPath.startsWith("/") ? subPath : `/${subPath}`
  return adminRoute(`/regulatory${normalizedSubPath}`)
}
