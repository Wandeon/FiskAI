"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteProduct } from "@/app/actions/product"
import { Button } from "@/components/ui/button"

interface DeleteProductButtonProps {
  productId: string
  productName: string
}

export function DeleteProductButton({ productId, productName }: DeleteProductButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Jeste li sigurni da želite obrisati proizvod "${productName}"?`)) {
      return
    }

    setLoading(true)
    const result = await deleteProduct(productId)

    if (result?.error) {
      alert(result.error)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "..." : "Obriši"}
    </Button>
  )
}
