import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { PosClient } from "./pos-client"

export default async function PosPage() {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  // Fetch products for the product grid
  const products = await db.product.findMany({
    where: { companyId: company.id, isActive: true },
    orderBy: { name: "asc" },
  })

  return (
    <PosClient
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        vatRate: Number(p.vatRate),
        sku: p.sku,
      }))}
      companyIban={company.iban}
      terminalReaderId={company.stripeTerminalReaderId}
    />
  )
}
