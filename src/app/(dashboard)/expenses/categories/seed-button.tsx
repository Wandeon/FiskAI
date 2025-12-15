"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"
import { seedDefaultCategories } from "@/app/actions/expense"

export function SeedButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSeed() {
    setIsLoading(true)
    const result = await seedDefaultCategories()
    setIsLoading(false)
    if (result.success) {
      toast.success("Zadane kategorije su kreirane")
      router.refresh()
    } else {
      toast.error(result.error || "Greška")
    }
  }

  return (
    <Button onClick={handleSeed} disabled={isLoading}>
      {isLoading ? "Kreiranje..." : "Kreiraj zadane kategorije"}
    </Button>
  )
}
