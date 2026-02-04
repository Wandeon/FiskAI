"use client"

import { useMemo } from "react"
import { Building2, User, MapPin, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { UNIT_CODES, type EInvoiceLineInput } from "@fiskai/shared"

interface SellerInfo {
  name: string
  oib: string | null
  address: string | null
  city: string | null
  zipCode: string | null
}

interface BuyerInfo {
  name: string
  oib: string | null
  address: string | null
  city: string | null
  zipCode: string | null
}

interface InvoicePreviewProps {
  seller: SellerInfo
  buyer: BuyerInfo
  lines: EInvoiceLineInput[]
  issueDate: string
  dueDate?: string
  buyerReference?: string
  notes?: string
  className?: string
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " EUR"

const formatNumber = (amount: number) =>
  new Intl.NumberFormat("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

interface VatSummaryItem {
  rate: number
  base: number
  amount: number
}

export function InvoicePreview({
  seller,
  buyer,
  lines,
  issueDate,
  dueDate,
  buyerReference,
  notes,
  className,
}: InvoicePreviewProps) {
  // Calculate totals and VAT summary
  const { totals, vatSummary } = useMemo(() => {
    let neto = 0
    let pdv = 0
    const vatMap = new Map<number, VatSummaryItem>()

    lines.forEach((line) => {
      const lineNeto = line.quantity * line.unitPrice
      const lineVat = lineNeto * (line.vatRate / 100)

      neto += lineNeto
      pdv += lineVat

      // Group by VAT rate
      const existing = vatMap.get(line.vatRate)
      if (existing) {
        existing.base += lineNeto
        existing.amount += lineVat
      } else {
        vatMap.set(line.vatRate, {
          rate: line.vatRate,
          base: lineNeto,
          amount: lineVat,
        })
      }
    })

    return {
      totals: {
        neto,
        pdv,
        ukupno: neto + pdv,
      },
      vatSummary: Array.from(vatMap.values()).sort((a, b) => b.rate - a.rate),
    }
  }, [lines])

  const cardClasses = "rounded-xl border border-white/10 bg-white/5 p-4"
  const labelClasses = "text-xs font-medium text-white/40 uppercase tracking-wide"

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-full bg-cyan-500/10 p-2">
          <FileText className="h-5 w-5 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Pregled racuna</h2>
      </div>

      {/* Seller & Buyer Info - Side by Side */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Seller */}
        <div className={cardClasses}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-cyan-400" />
            <span className={labelClasses}>Prodavatelj</span>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-white">{seller.name}</p>
            {seller.oib && (
              <p className="text-sm text-white/60">OIB: {seller.oib}</p>
            )}
            {(seller.address || seller.city) && (
              <p className="text-sm text-white/60 flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  {seller.address}
                  {seller.address && seller.city && ", "}
                  {seller.zipCode && `${seller.zipCode} `}
                  {seller.city}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Buyer */}
        <div className={cardClasses}>
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-cyan-400" />
            <span className={labelClasses}>Kupac</span>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-white">{buyer.name}</p>
            {buyer.oib && (
              <p className="text-sm text-white/60">OIB: {buyer.oib}</p>
            )}
            {(buyer.address || buyer.city) && (
              <p className="text-sm text-white/60 flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  {buyer.address}
                  {buyer.address && buyer.city && ", "}
                  {buyer.zipCode && `${buyer.zipCode} `}
                  {buyer.city}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dates & Reference */}
      <div className={cn(cardClasses, "grid gap-4 sm:grid-cols-3")}>
        <div>
          <span className={labelClasses}>Datum izdavanja</span>
          <p className="mt-1 font-medium text-white">{formatDate(issueDate)}</p>
        </div>
        {dueDate && (
          <div>
            <span className={labelClasses}>Datum dospijeca</span>
            <p className="mt-1 font-medium text-white">{formatDate(dueDate)}</p>
          </div>
        )}
        {buyerReference && (
          <div>
            <span className={labelClasses}>Referenca kupca</span>
            <p className="mt-1 font-medium text-white">{buyerReference}</p>
          </div>
        )}
      </div>

      {/* Line Items Table */}
      <div className={cn(cardClasses, "overflow-x-auto")}>
        <span className={cn(labelClasses, "block mb-3")}>Stavke</span>
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-2 text-left text-xs font-medium text-white/60">Opis</th>
              <th className="pb-2 text-right text-xs font-medium text-white/60 w-20">Kol.</th>
              <th className="pb-2 text-right text-xs font-medium text-white/60 w-24">Jed. c.</th>
              <th className="pb-2 text-right text-xs font-medium text-white/60 w-16">PDV</th>
              <th className="pb-2 text-right text-xs font-medium text-white/60 w-28">Iznos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {lines.map((line, index) => {
              const lineTotal = line.quantity * line.unitPrice
              return (
                <tr key={index}>
                  <td className="py-2 text-sm text-white pr-4">{line.description}</td>
                  <td className="py-2 text-sm text-white/80 text-right tabular-nums">
                    {formatNumber(line.quantity)} {UNIT_CODES[line.unit as keyof typeof UNIT_CODES] || "kom"}
                  </td>
                  <td className="py-2 text-sm text-white/80 text-right tabular-nums">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="py-2 text-sm text-white/80 text-right tabular-nums">
                    {line.vatRate}%
                  </td>
                  <td className="py-2 text-sm text-white text-right tabular-nums font-medium">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* VAT Summary & Totals */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* VAT Summary */}
        {vatSummary.length > 0 && (
          <div className={cardClasses}>
            <span className={cn(labelClasses, "block mb-3")}>PDV pregled</span>
            <div className="space-y-2">
              {vatSummary.map((vat) => (
                <div key={vat.rate} className="flex items-center justify-between text-sm">
                  <span className="text-white/60">
                    PDV {vat.rate}% (osnovica: {formatCurrency(vat.base)})
                  </span>
                  <span className="text-white tabular-nums">{formatCurrency(vat.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className={cn(cardClasses, "sm:ml-auto sm:w-full")}>
          <span className={cn(labelClasses, "block mb-3")}>Ukupno</span>
          <div className="space-y-2 font-mono">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Neto:</span>
              <span className="text-white tabular-nums">{formatCurrency(totals.neto)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">PDV:</span>
              <span className="text-white tabular-nums">{formatCurrency(totals.pdv)}</span>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex items-center justify-between text-lg font-bold">
                <span className="text-white">UKUPNO:</span>
                <span className="text-cyan-400 tabular-nums">{formatCurrency(totals.ukupno)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && notes.trim() && (
        <div className={cardClasses}>
          <span className={cn(labelClasses, "block mb-2")}>Napomene</span>
          <p className="text-sm text-white/80 whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  )
}

export default InvoicePreview
