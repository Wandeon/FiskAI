import Link from "next/link"
import { getContactList } from "@/app/actions/contact-list"
import { DeleteContactButton } from "./delete-button"
import { Button } from "@/components/ui/button"
import { ContactType } from "@prisma/client"

interface PageProps {
  searchParams: Promise<{ search?: string; type?: string; page?: string }>
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search || ""
  const type = (params.type as ContactType | "ALL") || "ALL"
  const page = parseInt(params.page || "1", 10)

  const { contacts, pagination } = await getContactList({
    search,
    type,
    page,
    limit: 20,
  })

  const typeLabels: Record<ContactType, string> = {
    CUSTOMER: "Kupac",
    SUPPLIER: "Dobavljač",
    BOTH: "Kupac/Dobavljač",
  }

  const typeColors: Record<ContactType, string> = {
    CUSTOMER: "bg-blue-100 text-blue-700",
    SUPPLIER: "bg-purple-100 text-purple-700",
    BOTH: "bg-green-100 text-green-700",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kontakti</h1>
          <p className="text-sm text-gray-600">
            {pagination.total} kontakata ukupno
          </p>
        </div>
        <Link href="/contacts/new">
          <Button>+ Novi kontakt</Button>
        </Link>
      </div>

      {/* Search and Filter */}
      <form className="flex gap-4" method="get">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Pretraži po nazivu, OIB-u ili emailu..."
          className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="type"
          defaultValue={type}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Svi tipovi</option>
          <option value="CUSTOMER">Kupci</option>
          <option value="SUPPLIER">Dobavljači</option>
          <option value="BOTH">Kupci/Dobavljači</option>
        </select>
        <Button type="submit" variant="outline">
          Filtriraj
        </Button>
      </form>

      {contacts.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">
            {search || type !== "ALL"
              ? "Nema kontakata koji odgovaraju filteru"
              : "Nemate još nijedan kontakt"}
          </p>
          {!search && type === "ALL" && (
            <Link href="/contacts/new" className="mt-2 inline-block text-blue-600 hover:underline">
              Dodajte prvi kontakt
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{contact.name}</h3>
                    <span
                      className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                        typeColors[contact.type]
                      }`}
                    >
                      {typeLabels[contact.type]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {contact._count.eInvoicesAsBuyer + contact._count.eInvoicesAsSeller} računa
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>OIB: {contact.oib}</p>
                  {contact.email && <p>{contact.email}</p>}
                  {contact.phone && <p>{contact.phone}</p>}
                  {contact.city && <p>{contact.city}</p>}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/contacts/${contact.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Uredi
                    </Button>
                  </Link>
                  <DeleteContactButton contactId={contact.id} contactName={contact.name} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/contacts?page=${page - 1}${search ? `&search=${search}` : ""}${type !== "ALL" ? `&type=${type}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Prethodna
                  </Button>
                </Link>
              )}
              <span className="text-sm text-gray-600">
                Stranica {page} od {pagination.totalPages}
              </span>
              {pagination.hasMore && (
                <Link
                  href={`/contacts?page=${page + 1}${search ? `&search=${search}` : ""}${type !== "ALL" ? `&type=${type}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Sljedeća
                  </Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
