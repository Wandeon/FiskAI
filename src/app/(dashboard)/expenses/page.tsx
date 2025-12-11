import { requireAuth, requireCompany } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { setTenantContext } from '@/lib/prisma-extensions'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ExpenseStatus, Prisma } from '@prisma/client'
import { ExpenseFilters } from '@/components/expenses/expense-filters'
import type { MultiSelectOption } from '@/components/ui/multi-select'

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
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)
  const params = await searchParams

  setTenantContext({
    companyId: company.id,
    userId: user.id!,
  })

  const searchTerm = Array.isArray(params.search) ? params.search[0] ?? '' : params.search ?? ''
  const statusParam = params.status
  const categoryParam = params.category

  const selectedStatuses = Array.isArray(statusParam)
    ? statusParam
    : statusParam
      ? [statusParam]
      : []
  const selectedCategories = Array.isArray(categoryParam)
    ? categoryParam
    : categoryParam
      ? [categoryParam]
      : []

  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page
  const page = parseInt(pageParam || '1')
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const where: PrismaExpenseWhere = {
    companyId: company.id,
  }

  const filteredStatuses = selectedStatuses.filter(isExpenseStatus)
  if (filteredStatuses.length > 0) {
    where.status = { in: filteredStatuses }
  }

  if (selectedCategories.length > 0) {
    where.categoryId = { in: selectedCategories }
  }

  if (searchTerm) {
    where.OR = [
      {
        vendor: {
          is: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
      },
      {
        description: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        vendor: {
          is: {
            oib: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
      },
    ]
  }

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

      <ExpenseFilters
        statusOptions={buildStatusOptions(STATUS_LABELS)}
        categoryOptions={buildCategoryOptions(categories)}
        initialStatuses={selectedStatuses}
        initialCategories={selectedCategories}
        initialSearch={searchTerm}
      />

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
            <Link
              href={buildPaginationLink(page - 1, searchTerm, selectedStatuses, selectedCategories)}
              className="px-3 py-1 border rounded hover:bg-gray-50"
            >
              ← Prethodna
            </Link>
          )}
          <span className="px-3 py-1">Stranica {page} od {totalPages}</span>
          {page < totalPages && (
            <Link
              href={buildPaginationLink(page + 1, searchTerm, selectedStatuses, selectedCategories)}
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

type PrismaExpenseWhere = Prisma.ExpenseWhereInput

function buildStatusOptions(dictionary: Record<string, string>): MultiSelectOption[] {
  return Object.entries(dictionary).map(([value, label]) => ({ value, label }))
}

function buildCategoryOptions(categories: Array<{ id: string; name: string }>): MultiSelectOption[] {
  return categories.map((category) => ({ value: category.id, label: category.name }))
}

function buildPaginationLink(page: number, search: string, statuses: string[], categories: string[]) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  if (search) params.set('search', search)
  statuses.forEach((status) => params.append('status', status))
  categories.forEach((category) => params.append('category', category))
  const query = params.toString()
  return query ? `/expenses?${query}` : '/expenses'
}

function isExpenseStatus(value: string): value is ExpenseStatus {
  return Object.values(ExpenseStatus).includes(value as ExpenseStatus)
}
