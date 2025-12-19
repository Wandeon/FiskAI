import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { EditContactForm } from "./edit-form"

interface EditContactPageProps {
  params: Promise<{ id: string }>
}

export default async function EditContactPage({ params }: EditContactPageProps) {
  const { id } = await params
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  const contact = await db.contact.findFirst({
    where: {
      id,
      companyId: company.id,
    },
  })

  if (!contact) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Uredi kontakt</h1>
      <EditContactForm contact={contact} />
    </div>
  )
}
