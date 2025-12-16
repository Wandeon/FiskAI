import { Metadata } from "next"
import Link from "next/link"
import { DeadlineCalendar } from "@/components/knowledge-hub/tools/DeadlineCalendar"

export const metadata: Metadata = {
  title: "Kalendar Rokova 2025 | FiskAI",
  description: "Svi važni porezni rokovi za 2025. godinu na jednom mjestu.",
}

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 md:px-6">
      <nav className="mb-6 text-sm text-[var(--muted)]">
        <Link href="/baza-znanja" className="hover:text-[var(--foreground)]">
          Baza znanja
        </Link>{" "}
        <span className="text-[var(--muted)]">/</span>{" "}
        <Link href="/alati" className="hover:text-[var(--foreground)]">
          Alati
        </Link>{" "}
        <span className="text-[var(--muted)]">/</span>{" "}
        <span className="text-[var(--foreground)]">Kalendar</span>
      </nav>

      <header>
        <h1 className="text-display text-4xl font-semibold">Kalendar rokova 2025</h1>
        <p className="mt-4 text-[var(--muted)]">Ne propustite važne rokove za prijave i uplate.</p>
      </header>

      <div className="mt-8">
        <DeadlineCalendar year={2025} />
      </div>
    </div>
  )
}
