import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { requireCompany } from "@/lib/auth-utils"
import { getContacts } from "@/app/actions/contact"
import { getProducts } from "@/app/actions/product"
import { InvoiceForm } from "./invoice-form"
import { deriveCapabilities } from "@/lib/capabilities"

export default async function NewEInvoicePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const company = await requireCompany(session.user.id)
  const [contacts, products] = await Promise.all([
    getContacts("CUSTOMER"),
    getProducts(),
  ])

  const capabilities = deriveCapabilities(company)

  return <InvoiceForm contacts={contacts} products={products} company={company} capabilities={capabilities} />
}
