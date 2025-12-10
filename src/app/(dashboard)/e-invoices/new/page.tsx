import { getContacts } from "@/app/actions/contact"
import { InvoiceForm } from "./invoice-form"

export default async function NewEInvoicePage() {
  const contacts = await getContacts("CUSTOMER")

  return <InvoiceForm contacts={contacts} />
}
