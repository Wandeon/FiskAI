import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@fiskai/db"
import { EInvoiceWizard } from "@/components/einvoice"

export const metadata = {
  title: "Novi racun | FiskAI",
  description: "Kreirajte novi e-racun",
}

async function getCompanyId() {
  const session = await auth()
  if (!session?.user?.id) return null

  const member = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
  })

  return member?.companyId || null
}

export default async function NewInvoicePage() {
  const companyId = await getCompanyId()

  if (!companyId) {
    redirect("/onboarding")
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Back Link */}
        <Link
          href="/invoices"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Natrag na racune
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Novi racun
          </h1>
          <p className="mt-2 text-white/60">
            Kreirajte novi e-racun u nekoliko koraka
          </p>
        </div>

        {/* Wizard */}
        <EInvoiceWizard companyId={companyId} />
      </div>
    </div>
  )
}
