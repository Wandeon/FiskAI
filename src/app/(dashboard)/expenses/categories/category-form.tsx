'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'
import { createExpenseCategory } from '@/app/actions/expense'

export function CategoryForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setIsLoading(true)

    const result = await createExpenseCategory({
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      vatDeductibleDefault: formData.get('vatDeductible') === 'on',
    })

    setIsLoading(false)
    if (result.success) {
      toast.success('Kategorija je dodana')
      router.refresh()
      ;(e.target as HTMLFormElement).reset()
    } else {
      toast.error(result.error || 'Greška')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
      <div>
        <Input name="code" placeholder="Kod (npr. MARKETING)" required className="font-mono w-40" />
      </div>
      <div className="flex-1">
        <Input name="name" placeholder="Naziv kategorije" required />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="vatDeductible" defaultChecked className="rounded" />
        PDV priznati
      </label>
      <Button type="submit" disabled={isLoading}>{isLoading ? '...' : 'Dodaj'}</Button>
    </form>
  )
}
