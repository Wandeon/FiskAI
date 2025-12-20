// src/lib/tutorials/triggers.ts

import { THRESHOLDS } from "@/lib/fiscal-data"

export interface ContextualTrigger {
  id: string
  type: "success" | "warning" | "info"
  title: string
  description: string
  href?: string
  dismissible: boolean
}

export interface TriggerContext {
  companyId: string
  invoiceCount: number
  yearlyRevenue: number
  hasFiscalCert: boolean
  lastBankImport?: Date
}

export async function getActiveTriggersForContext(
  ctx: TriggerContext
): Promise<ContextualTrigger[]> {
  const triggers: ContextualTrigger[] = []
  const limit = THRESHOLDS.pausalni.value

  // First invoice created
  if (ctx.invoiceCount === 1) {
    triggers.push({
      id: "first-invoice",
      type: "success",
      title: "Prvi račun kreiran!",
      description: "Vaš račun je automatski upisan u Knjigu primitaka (KPR)",
      href: "/pausalni",
      dismissible: true,
    })
  }

  // Approaching 60k limit (85%)
  if (ctx.yearlyRevenue >= limit * 0.85 && ctx.yearlyRevenue < limit * 0.95) {
    triggers.push({
      id: "approaching-60k",
      type: "warning",
      title: `Na ${Math.round((ctx.yearlyRevenue / limit) * 100)}% ste limita`,
      description: "Približavate se limitu od 60.000 EUR za paušalni obrt",
      href: "/vodici/pausalni-limit",
      dismissible: false,
    })
  }

  // Critical 60k limit (95%)
  if (ctx.yearlyRevenue >= limit * 0.95) {
    triggers.push({
      id: "critical-60k",
      type: "warning",
      title: "HITNO: Na 95% ste limita!",
      description: "Trebate razmotriti prijelaz na d.o.o. ili realni obrt",
      href: "/vodici/prelazak-doo",
      dismissible: false,
    })
  }

  // First bank import
  if (ctx.lastBankImport) {
    const hoursSinceImport = (Date.now() - ctx.lastBankImport.getTime()) / (1000 * 60 * 60)
    if (hoursSinceImport < 1) {
      triggers.push({
        id: "first-bank-import",
        type: "info",
        title: "Bankovni podaci uvezeni!",
        description: "Povežite uplate s računima za automatsko označavanje plaćenih",
        href: "/banking/reconcile",
        dismissible: true,
      })
    }
  }

  return triggers
}
