import { requireAuth, requireCompany } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { setTenantContext } from '@/lib/prisma-extensions'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ExpenseStatus } from '@prisma/client'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nacrt',
  PENDING: 'Čeka plaćanje',
  PAID: 'Plaćeno',
  CANCELLED: 'Otkazano',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; page?: string }>
}) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)
  const params = await searchParams

  setTenantContext({
    companyId: company.id,
    userId: user.id!,
  })

  const page = parseInt(params.page || '1')
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const where: { companyId: string; status?: ExpenseStatus; categoryId?: string } = {
    companyId: company.id,
  }
  if (params.status) where.status = params.status as ExpenseStatus
  if (params.category) where.categoryId = params.category

  const [expenses, total, categories, stats] = await Promise.all([
    db.expense.findMany({
      where,
      include: {
        vendor: { select: { name: true } },
        category: { select: { name: true, code: true } },
      },
      orderBy: { date: 'desc' },
      take: pageSize,
      skip,
    }),
    db.expense.count({ where }),
    db.expenseCategory.findMany({
      where: { OR: [{ companyId: company.id }, { companyId: null }] },
      orderBy: { name: 'asc' },
    }),
    db.expense.aggregate({
      where: { companyId: company.id, status: 'PAID' },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    {
      key: 'date',
      header: 'Datum',
      cell: (exp: typeof expenses[0]) => new Date(exp.date).toLocaleDateString('hr-HR')
    },
    {
      key: 'description',
      header: 'Opis',
      cell: (exp: typeof expenses[0]) => exp.description.length > 40 ? exp.description.slice(0, 40) + '...' : exp.description
    },
    {
      key: 'vendor',
      header: 'Dobavljač',
      cell: (exp: typeof expenses[0]) => exp.vendor?.name || '-'
    },
    {
      key: 'category',
      header: 'Kategorija',
      cell: (exp: typeof expenses[0]) => exp.category.name
    },
    {
      key: 'totalAmount',
      header: 'Iznos',
      cell: (exp: typeof expenses[0]) => new Intl.NumberFormat('hr-HR', {
        style: 'currency',
        currency: exp.currency,
      }).format(Number(exp.totalAmount))
    },
    {
      key: 'status',
      header: 'Status',
      cell: (exp: typeof expenses[0]) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[exp.status]}`}>
          {STATUS_LABELS[exp.status]}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      cell: (exp: typeof expenses[0]) => (
        <Link href={`/expenses/${exp.id}`} className="text-sm text-blue-600 hover:underline">
          Pregledaj
        </Link>
      )
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Troškovi</h1>
          <p className="text-gray-500">Praćenje poslovnih troškova i rashoda</p>
        </div>
        <div className="flex gap-2">
          <Link href="/expenses/categories">
            <Button variant="outline">Kategorije</Button>
          </Link>
          <Link href="/expenses/new">
            <Button>+ Novi trošak</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-sm text-gray-500">Ukupno troškova</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(
                Number(stats._sum.totalAmount || 0)
              )}
            </p>
            <p className="text-sm text-gray-500">Plaćeno</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <form className="flex gap-2" method="GET">
        <select name="status" defaultValue={params.status || ''} className="rounded-md border-gray-300 text-sm">
          <option value="">Svi statusi</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select name="category" defaultValue={params.category || ''} className="rounded-md border-gray-300 text-sm">
          <option value="">Sve kategorije</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtriraj</Button>
        {(params.status || params.category) && (
          <Link href="/expenses"><Button variant="ghost" size="sm">Očisti</Button></Link>
        )}
      </form>

      {/* Table */}
      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">Nema troškova</p>
            <Link href="/expenses/new"><Button>Dodaj prvi trošak</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={expenses} caption="Popis troškova" getRowKey={(exp) => exp.id} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`?page=${page - 1}${params.status ? `&status=${params.status}` : ''}${params.category ? `&category=${params.category}` : ''}`} className="px-3 py-1 border rounded hover:bg-gray-50">
              ← Prethodna
            </Link>
          )}
          <span className="px-3 py-1">Stranica {page} od {totalPages}</span>
          {page < totalPages && (
            <Link href={`?page=${page + 1}${params.status ? `&status=${params.status}` : ''}${params.category ? `&category=${params.category}` : ''}`} className="px-3 py-1 border rounded hover:bg-gray-50">
              Sljedeća →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
