// src/app/(marketing)/vodic/page.tsx
import Link from "next/link"
import { getAllGuides } from "@/lib/knowledge-hub/mdx"
import type { Metadata } from "next"
import { GuidesExplorer } from "@/components/knowledge-hub/guide/GuidesExplorer"

export const metadata: Metadata = {
  title: "Vodiči za poslovanje | FiskAI",
  description:
    "Kompletan vodič za sve oblike poslovanja u Hrvatskoj - paušalni obrt, obrt na dohodak, d.o.o. i više.",
}

export default function GuidesIndexPage() {
  const guides = getAllGuides().map((guide) => ({
    slug: guide.slug,
    title: guide.frontmatter.title,
    description: guide.frontmatter.description,
  }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <nav className="mb-6 text-sm text-[var(--muted)]">
        <Link href="/baza-znanja" className="hover:text-[var(--foreground)]">
          Baza znanja
        </Link>{" "}
        <span className="text-[var(--muted)]">/</span>{" "}
        <span className="text-[var(--foreground)]">Vodiči</span>
      </nav>

      <header className="text-center">
        <h1 className="text-display text-4xl font-semibold md:text-5xl">Vodiči za poslovanje</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
          Sve što trebate znati o poslovanju u Hrvatskoj — porezni razredi, doprinosi, registracija
          i obveze.
        </p>
      </header>

      <GuidesExplorer guides={guides} />
    </div>
  )
}
