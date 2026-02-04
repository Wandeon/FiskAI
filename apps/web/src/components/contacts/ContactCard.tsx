"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Mail, Phone, MapPin, FileText, Edit2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ContactCardProps {
  contact: {
    id: string
    name: string
    type: "CUSTOMER" | "SUPPLIER" | "BOTH"
    oib: string | null
    email: string | null
    phone: string | null
    city: string | null
    _count: { invoices: number }
  }
  onDelete?: (id: string) => void
}

const typeConfig = {
  CUSTOMER: { label: "Kupac", className: "bg-cyan-500/20 text-cyan-400" },
  SUPPLIER: { label: "Dobavljac", className: "bg-purple-500/20 text-purple-400" },
  BOTH: { label: "Kupac/Dobavljac", className: "bg-emerald-500/20 text-emerald-400" },
}

export function ContactCard({ contact, onDelete }: ContactCardProps) {
  const type = typeConfig[contact.type]
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-4 p-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-lg font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">
                <Link href={`/contacts/${contact.id}`} className="hover:text-cyan-400 transition-colors">
                  {contact.name}
                </Link>
              </h3>
              {contact.oib && <p className="text-sm text-white/50 font-mono">{contact.oib}</p>}
            </div>
            <span className={cn("flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", type.className)}>
              {type.label}
            </span>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="border-t border-white/10 px-4 py-3 space-y-2">
        {contact.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-white/40" />
            <a href={`mailto:${contact.email}`} className="text-white/70 hover:text-cyan-400 truncate">{contact.email}</a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-white/40" />
            <a href={`tel:${contact.phone}`} className="text-white/70 hover:text-cyan-400">{contact.phone}</a>
          </div>
        )}
        {contact.city && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-white/40" />
            <span className="text-white/50">{contact.city}</span>
          </div>
        )}
        {!contact.email && !contact.phone && !contact.city && (
          <p className="text-sm text-white/30 italic">Nema kontakt podataka</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 bg-white/5">
        <div className="flex items-center gap-1.5 text-sm text-white/50">
          <FileText className="h-4 w-4" />
          <span>{contact._count.invoices} racuna</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/contacts/${contact.id}/edit`} className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <Edit2 className="h-4 w-4" />
          </Link>
          {onDelete && (
            <button onClick={() => onDelete(contact.id)} className="rounded-lg p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
