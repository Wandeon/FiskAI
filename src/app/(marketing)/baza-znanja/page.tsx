import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllGuides, getAllComparisons } from "@/lib/knowledge-hub/mdx"
import { BookOpen, Calculator, GitCompare, Sparkles, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Baza znanja | FiskAI",
  description:
    "Vodiči, usporedbe i besplatni alati za hrvatske poduzetnike: paušalni obrt, obrt na dohodak, j.d.o.o., d.o.o. i PDV prag.",
}

export default async function KnowledgeBasePage() {
  const guides = getAllGuides().slice(0, 6)
  const comparisons = (await getAllComparisons()).slice(0, 6)

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <header className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
          <Sparkles className="h-4 w-4" />
          Centar znanja
        </div>
        <h1 className="mt-6 text-display text-4xl font-semibold md:text-5xl">
          Baza znanja + besplatni alati za hrvatske poduzetnike
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
          Brzo pronađite odgovor: koji oblik poslovanja ima smisla, što se mijenja kad prijeđete
          60.000€ i koje su vaše obveze — bez registracije.
        </p>
      </header>

      <section className="mt-12 grid gap-6 md:grid-cols-4">
        <Link href="/wizard" className="group">
          <Card className="card card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Čarobnjak
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Odgovorite na 4 pitanja i dobijte preporuku + vodič.
            </CardContent>
          </Card>
        </Link>

        <Link href="/vodic" className="group">
          <Card className="card card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Vodiči
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Detaljno: porezi, doprinosi, registracija i obveze.
            </CardContent>
          </Card>
        </Link>

        <Link href="/usporedba/pocinjem-solo" className="group">
          <Card className="card card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-blue-600" />
                  Usporedbe
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Tablice i kalkulatori za odluku (paušal vs obrt vs d.o.o.).
            </CardContent>
          </Card>
        </Link>

        <Link href="/alati" className="group">
          <Card className="card card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Alati
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              PDV prag, porez, doprinosi, uplatnice i kalendar rokova.
            </CardContent>
          </Card>
        </Link>
      </section>

      {!!comparisons.length && (
        <section className="mt-14">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-display text-3xl font-semibold">Usporedbe</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Brza odluka uz tablice i kalkulator troškova.
              </p>
            </div>
            <Link href="/usporedba/pocinjem-solo" className="text-sm font-semibold text-blue-700">
              Otvori sve usporedbe →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comparisons.map((comparison) => (
              <Link key={comparison.slug} href={`/usporedba/${comparison.slug}`} className="group">
                <Card className="card card-hover h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{comparison.frontmatter.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-[var(--muted)]">
                    {comparison.frontmatter.description}
                    <span className="mt-3 block text-xs font-semibold text-blue-700 group-hover:underline">
                      Otvori →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!guides.length && (
        <section className="mt-14">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-display text-3xl font-semibold">Vodiči</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Kompletni vodiči po obliku poslovanja (s hrvatskim terminima).
              </p>
            </div>
            <Link href="/vodic" className="text-sm font-semibold text-blue-700">
              Pregledaj vodiče →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Link key={guide.slug} href={`/vodic/${guide.slug}`} className="group">
                <Card className="card card-hover h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{guide.frontmatter.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-[var(--muted)]">
                    {guide.frontmatter.description}
                    <span className="mt-3 block text-xs font-semibold text-blue-700 group-hover:underline">
                      Otvori →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
