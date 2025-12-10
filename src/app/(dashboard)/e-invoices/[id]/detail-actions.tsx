"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { sendEInvoice, deleteEInvoice } from "@/app/actions/e-invoice"
import { Button } from "@/components/ui/button"

interface InvoiceDetailActionsProps {
  invoiceId: string
  status: string
  hasProvider: boolean
}

export function InvoiceDetailActions({ invoiceId, status, hasProvider }: InvoiceDetailActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<string | null>(null)

  async function handleSend() {
    if (!hasProvider) {
      alert("Molimo konfigurirajte informacijskog posrednika u postavkama prije slanja računa.")
      return
    }

    if (!confirm("Jeste li sigurni da želite poslati ovaj račun?")) {
      return
    }

    setLoading(true)
    setAction("send")

    const result = await sendEInvoice(invoiceId)

    if (result?.error) {
      alert(result.error)
      setLoading(false)
      setAction(null)
      return
    }

    router.refresh()
    setLoading(false)
    setAction(null)
  }

  async function handleDelete() {
    if (!confirm("Jeste li sigurni da želite obrisati ovaj račun? Ova akcija se ne može poništiti.")) {
      return
    }

    setLoading(true)
    setAction("delete")

    const result = await deleteEInvoice(invoiceId)

    if (result?.error) {
      alert(result.error)
      setLoading(false)
      setAction(null)
      return
    }

    router.push("/e-invoices")
  }

  const canSend = status === "DRAFT" || status === "ERROR"
  const canEdit = status === "DRAFT"
  const canDelete = status === "DRAFT"

  return (
    <div className="flex gap-2">
      {canEdit && (
        <Link href={`/e-invoices/${invoiceId}/edit`}>
          <Button variant="outline">Uredi</Button>
        </Link>
      )}

      {canSend && (
        <Button onClick={handleSend} disabled={loading}>
          {loading && action === "send" ? "Slanje..." : "Pošalji račun"}
        </Button>
      )}

      {canDelete && (
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading && action === "delete" ? "Brisanje..." : "Obriši"}
        </Button>
      )}
    </div>
  )
}
