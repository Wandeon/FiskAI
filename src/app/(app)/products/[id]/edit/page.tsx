import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { EditProductForm } from "./edit-form"

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  const product = await db.product.findFirst({
    where: {
      id,
      companyId: company.id,
    },
  })

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Uredi proizvod</h1>
      <EditProductForm product={product} />
    </div>
  )
}
