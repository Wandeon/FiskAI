// src/app/(marketing)/vodic/page.tsx
import Link from "next/link"
import { getAllGuides } from "@/lib/knowledge-hub/mdx"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Vodiči za poslovanje | FiskAI",
  description:
    "Kompletan vodič za sve oblike poslovanja u Hrvatskoj - paušalni obrt, obrt na dohodak, d.o.o. i više.",
}

export default function GuidesIndexPage() {
  const guides = getAllGuides()

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

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <Link key={guide.slug} href={`/vodic/${guide.slug}`} className="group">
            <Card className="card card-hover h-full">
              <CardHeader>
                <CardTitle className="text-lg">{guide.frontmatter.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--muted)] mb-4">{guide.frontmatter.description}</p>
                <div className="flex flex-wrap gap-2">
                  {guide.frontmatter.requiresFiscalization && (
                    <span className="text-xs bg-warning-50 text-warning-700 px-2 py-1 rounded-full border border-warning-100">
                      Fiskalizacija
                    </span>
                  )}
                  {guide.frontmatter.maxRevenue && (
                    <span className="text-xs bg-blue-600/10 text-blue-700 px-2 py-1 rounded-full border border-blue-600/20">
                      Max {guide.frontmatter.maxRevenue.toLocaleString()} EUR
                    </span>
                  )}
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 group-hover:underline">
                  Otvori vodič <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
