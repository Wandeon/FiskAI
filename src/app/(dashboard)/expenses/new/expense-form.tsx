'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { createExpense } from '@/app/actions/expense'
import type { ExpenseCategory } from '@prisma/client'

interface ExpenseFormProps {
  vendors: Array<{ id: string; name: string }>
  categories: ExpenseCategory[]
}

export function ExpenseForm({ vendors, categories }: ExpenseFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [netAmount, setNetAmount] = useState('')
  const [vatRate, setVatRate] = useState('25')
  const [vatDeductible, setVatDeductible] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')

  const net = parseFloat(netAmount) || 0
  const vat = net * (parseFloat(vatRate) / 100)
  const total = net + vat

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId) { toast.error('Odaberite kategoriju'); return }
    if (!description) { toast.error('Unesite opis'); return }
    if (net <= 0) { toast.error('Unesite iznos'); return }

    setIsLoading(true)
    const result = await createExpense({
      categoryId,
      vendorId: vendorId || undefined,
      description,
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      netAmount: net,
      vatAmount: vat,
      totalAmount: total,
      vatDeductible,
      paymentMethod: paymentMethod || undefined,
      notes: notes || undefined,
    })
    setIsLoading(false)

    if (result.success) {
      toast.success('Trošak je spremljen')
      router.push('/expenses')
    } else {
      toast.error(result.error || 'Greška pri spremanju')
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Osnovni podaci</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Kategorija *</Label>
            <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); const cat = categories.find(c => c.id === e.target.value); if (cat) setVatDeductible(cat.vatDeductibleDefault); }} className="w-full mt-1 rounded-md border-gray-300" required>
              <option value="">Odaberite...</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <Label>Dobavljač</Label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full mt-1 rounded-md border-gray-300">
              <option value="">Nepoznat</option>
              {vendors.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Opis *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Npr. Uredski materijal - papir A4" required />
          </div>
          <div>
            <Label>Datum *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>Rok plaćanja</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Iznosi</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Neto iznos (EUR) *</Label>
            <Input type="number" step="0.01" min="0" value={netAmount} onChange={(e) => setNetAmount(e.target.value)} required />
          </div>
          <div>
            <Label>PDV stopa</Label>
            <select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="w-full mt-1 rounded-md border-gray-300">
              <option value="25">25%</option>
              <option value="13">13%</option>
              <option value="5">5%</option>
              <option value="0">0%</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={vatDeductible} onChange={(e) => setVatDeductible(e.target.checked)} className="rounded" />
              PDV priznati
            </label>
          </div>
        </CardContent>
        <CardContent className="border-t pt-4">
          <div className="flex justify-end">
            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-8"><dt className="text-gray-500">Neto:</dt><dd className="font-mono">{formatCurrency(net)}</dd></div>
              <div className="flex justify-between gap-8"><dt className="text-gray-500">PDV:</dt><dd className="font-mono">{formatCurrency(vat)}</dd></div>
              <div className="flex justify-between gap-8 text-lg border-t pt-2"><dt className="font-medium">Ukupno:</dt><dd className="font-bold font-mono">{formatCurrency(total)}</dd></div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Plaćanje</CardTitle></CardHeader>
        <CardContent>
          <div>
            <Label>Način plaćanja</Label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full mt-1 rounded-md border-gray-300">
              <option value="">Nije plaćeno</option>
              <option value="CASH">Gotovina</option>
              <option value="CARD">Kartica</option>
              <option value="TRANSFER">Virman</option>
              <option value="OTHER">Ostalo</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Napomene</CardTitle></CardHeader>
        <CardContent>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" rows={3} placeholder="Dodatne napomene..." />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/expenses"><Button type="button" variant="outline">Odustani</Button></Link>
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Spremanje...' : 'Spremi trošak'}</Button>
      </div>
    </form>
  )
}
