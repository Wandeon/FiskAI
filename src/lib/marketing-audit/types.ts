export interface MarketingAuditConfig {
  repos: string[]
  marketingRoot: string
  auditOutput: string
  targetBaseUrl: string
  registryPath: string
}

export interface RouteEntry {
  route: string
  file: string
}

export interface RegistryPage {
  route: string
  file: string
  ctas: Array<{
    label: string
    selector?: string
    href?: string
    kind: "link" | "button"
  }>
  dataDependencies: string[]
  toolChecks: string[]
  notes: string
}

export interface MarketingRegistry {
  pages: RegistryPage[]
}
