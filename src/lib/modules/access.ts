import { ModuleKey, MODULES } from "./definitions"

export interface ModuleAccess {
  hasModule: (moduleKey: ModuleKey) => boolean
  getEnabledModules: () => ModuleKey[]
  canAccessRoute: (pathname: string) => boolean
  getModuleForRoute: (pathname: string) => ModuleKey | null
}

export function createModuleAccess(entitlements: string[]): ModuleAccess {
  const enabledModules = new Set(entitlements as ModuleKey[])

  function hasModule(moduleKey: ModuleKey): boolean {
    return enabledModules.has(moduleKey)
  }

  function getEnabledModules(): ModuleKey[] {
    return Array.from(enabledModules)
  }

  function getModuleForRoute(pathname: string): ModuleKey | null {
    // Normalize pathname - remove trailing slash, handle dynamic segments
    const normalizedPath = pathname.replace(/\/$/, "").replace(/\/[^\/]+$/, "/[id]")

    for (const [key, module] of Object.entries(MODULES)) {
      for (const route of module.routes) {
        // Check exact match
        if (pathname === route || pathname.startsWith(route + "/")) {
          return key as ModuleKey
        }
        // Check dynamic route match
        if (normalizedPath === route) {
          return key as ModuleKey
        }
      }
    }
    return null
  }

  function canAccessRoute(pathname: string): boolean {
    const moduleKey = getModuleForRoute(pathname)
    // If route doesn't belong to any module, allow access
    if (!moduleKey) return true
    // Check if module is enabled
    return hasModule(moduleKey)
  }

  return {
    hasModule,
    getEnabledModules,
    canAccessRoute,
    getModuleForRoute,
  }
}
