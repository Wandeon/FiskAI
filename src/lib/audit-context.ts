import { AsyncLocalStorage } from "node:async_hooks"

type AuditActorType = "USER" | "SYSTEM" | "API"

export interface AuditContext {
  actorId?: string
  actorType?: AuditActorType
  reason?: string
}

const auditContextStore = new AsyncLocalStorage<AuditContext>()

export function getAuditContext(): AuditContext | null {
  return auditContextStore.getStore() ?? null
}

export function runWithAuditContext<T>(context: AuditContext, fn: () => T): T {
  return auditContextStore.run(context, fn)
}

export function updateAuditContext(context: Partial<AuditContext>): void {
  const store = auditContextStore.getStore()
  if (!store) return
  Object.assign(store, context)
}
