import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DeleteProductButton } from "./delete-button"
import { unitCodes, vatCategories } from "@/lib/validations/product"

export default async function ProductsPage() {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  const products = await db.product.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
  })

  const getUnitName = (code: string) =>
    unitCodes.find(u => u.code === code)?.name || code

  const getVatCategoryName = (code: string) =>
    vatCategories.find(v => v.code === code)?.name || code

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proizvodi i usluge</h1>
        <Link href="/products/new">
          <Button>Novi proizvod</Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500 mb-4">Nemate još nijednog proizvoda</p>
            <Link href="/products/new">
              <Button>Dodaj prvi proizvod</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Naziv</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Šifra</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Cijena</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Jedinica</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">PDV</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {product.sku || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {Number(product.price).toFixed(2)} EUR
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {getUnitName(product.unit)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {Number(product.vatRate)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {product.isActive ? "Aktivan" : "Neaktivan"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${product.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Uredi
                        </Button>
                      </Link>
                      <DeleteProductButton
                        productId={product.id}
                        productName={product.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
