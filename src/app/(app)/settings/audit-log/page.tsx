import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { setTenantContext } from "@/lib/prisma-extensions"
import { DataTable } from "@/components/ui/data-table"
import Link from "next/link"
import { AuditAction } from "@prisma/client"

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Kreiranje",
  UPDATE: "Izmjena",
  DELETE: "Brisanje",
  VIEW: "Pregled",
  EXPORT: "Izvoz",
  LOGIN: "Prijava",
  LOGOUT: "Odjava",
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  VIEW: "bg-gray-100 text-gray-800",
  EXPORT: "bg-purple-100 text-purple-800",
  LOGIN: "bg-yellow-100 text-yellow-800",
  LOGOUT: "bg-orange-100 text-orange-800",
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entity?: string }>
}) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  setTenantContext({
    companyId: company.id,
    userId: user.id!,
  })

  const params = await searchParams
  const page = parseInt(params.page || "1")
  const pageSize = 50
  const skip = (page - 1) * pageSize

  // Build filter conditions
  const where: {
    companyId: string
    action?: AuditAction
    entity?: string
  } = {
    companyId: company.id,
  }

  if (params.action && params.action in AuditAction) {
    where.action = params.action as AuditAction
  }
  if (params.entity) {
    where.entity = params.entity
  }

  // Fetch audit logs with user info
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: pageSize,
      skip,
      include: {
        company: {
          select: { name: true },
        },
      },
    }),
    db.auditLog.count({ where }),
  ])

  // Get unique entities for filter dropdown
  const entities = await db.auditLog.groupBy({
    by: ["entity"],
    where: { companyId: company.id },
  })

  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    {
      key: "timestamp",
      header: "Datum/Vrijeme",
      cell: (log: (typeof logs)[0]) => new Date(log.timestamp).toLocaleString("hr-HR"),
    },
    {
      key: "action",
      header: "Akcija",
      cell: (log: (typeof logs)[0]) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-100"}`}
        >
          {ACTION_LABELS[log.action] || log.action}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entitet",
      cell: (log: (typeof logs)[0]) => log.entity,
    },
    {
      key: "entityId",
      header: "ID",
      cell: (log: (typeof logs)[0]) => (
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
          {log.entityId.slice(0, 8)}...
        </code>
      ),
    },
    {
      key: "changes",
      header: "Promjene",
      cell: (log: (typeof logs)[0]) =>
        log.changes ? (
          <details className="cursor-pointer">
            <summary className="text-xs text-blue-600">Prikaži</summary>
            <pre className="text-xs mt-1 p-2 bg-gray-50 rounded max-w-xs overflow-auto">
              {JSON.stringify(log.changes, null, 2)}
            </pre>
          </details>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revizijski dnevnik</h1>
          <p className="text-gray-500">Pregled svih akcija u sustavu</p>
        </div>
        <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">
          ← Natrag na postavke
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
        <form className="flex gap-4" method="GET">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Akcija</label>
            <select
              name="action"
              defaultValue={params.action || ""}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">Sve akcije</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entitet</label>
            <select
              name="entity"
              defaultValue={params.entity || ""}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">Svi entiteti</option>
              {entities.map(({ entity }) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Filtriraj
            </button>
          </div>
        </form>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        Prikazano {logs.length} od {total} zapisa
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={logs}
        caption="Revizijski dnevnik"
        getRowKey={(log) => log.id}
        emptyMessage="Nema revizijskih zapisa"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${params.action ? `&action=${params.action}` : ""}${params.entity ? `&entity=${params.entity}` : ""}`}
              className="px-3 py-1 border rounded hover:bg-gray-50"
            >
              ← Prethodna
            </Link>
          )}
          <span className="px-3 py-1">
            Stranica {page} od {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}${params.action ? `&action=${params.action}` : ""}${params.entity ? `&entity=${params.entity}` : ""}`}
              className="px-3 py-1 border rounded hover:bg-gray-50"
            >
              Sljedeća →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
