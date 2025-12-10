import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DeleteContactButton } from "./delete-button"

export default async function ContactsPage() {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  const contacts = await db.contact.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
  })

  const typeLabels = {
    CUSTOMER: "Kupac",
    SUPPLIER: "Dobavljač",
    BOTH: "Kupac/Dobavljač",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kontakti</h1>
        <Link href="/contacts/new">
          <Button>Novi kontakt</Button>
        </Link>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500 mb-4">Nemate još nijednog kontakta</p>
            <Link href="/contacts/new">
              <Button>Dodaj prvi kontakt</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{contact.name}</h3>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {typeLabels[contact.type]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {contact.oib && <span>OIB: {contact.oib}</span>}
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                      {contact.city && <span>{contact.city}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/contacts/${contact.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Uredi
                      </Button>
                    </Link>
                    <DeleteContactButton contactId={contact.id} contactName={contact.name} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
