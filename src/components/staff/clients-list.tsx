import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Building2, AlertCircle, ChevronRight } from 'lucide-react'

async function getAssignedClients(userId: string) {
  const assignments = await db.staffAssignment.findMany({
    where: { staffId: userId },
    include: {
      company: {
        include: {
          _count: {
            select: {
              eInvoices: true,
              expenses: true,
              supportTickets: { where: { status: { not: 'CLOSED' } } },
            },
          },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  })

  return assignments.map(a => ({
    id: a.company.id,
    name: a.company.name,
    oib: a.company.oib,
    entitlements: a.company.entitlements as string[],
    assignedAt: a.assignedAt,
    notes: a.notes,
    stats: {
      invoices: a.company._count.eInvoices,
      expenses: a.company._count.expenses,
      openTickets: a.company._count.supportTickets,
    },
  }))
}

export async function ClientsList() {
  const user = await getCurrentUser()
  if (!user) return null

  const clients = await getAssignedClients(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            {clients.length} assigned client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Input
          type="search"
          placeholder="Search clients..."
          className="w-64"
        />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No clients assigned yet</p>
            <p className="text-sm text-muted-foreground">
              Contact your admin to get client assignments
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{client.name}</h3>
                      {client.stats.openTickets > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {client.stats.openTickets}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">OIB: {client.oib}</p>
                    {client.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{client.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="text-center">
                      <div className="font-medium text-foreground">{client.stats.invoices}</div>
                      <div className="text-xs">Invoices</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground">{client.stats.expenses}</div>
                      <div className="text-xs">Expenses</div>
                    </div>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
