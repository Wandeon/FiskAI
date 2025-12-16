"use client"

import Link from "next/link"
import { FileText, ScanText, Sparkles, Shield, Users, Landmark, ArrowRight } from "lucide-react"
import { FeatureStoryScroller } from "@/components/marketing/FeatureStoryScroller"
import { Reveal } from "@/components/motion/Reveal"
import { Stagger, StaggerItem } from "@/components/motion/Stagger"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MarketingFeaturesClient() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <Stagger className="text-center">
        <StaggerItem>
          <h1 className="text-display text-4xl font-semibold md:text-5xl">Mogućnosti</h1>
        </StaggerItem>
        <StaggerItem>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
            FiskAI je modularan: počnite s osnovama (paušalni obrt), a zatim dodajte e-račune,
            fiskalizaciju i napredne funkcije kako rastete.
          </p>
        </StaggerItem>
        <StaggerItem>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Pogledaj cijene <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--surface-secondary)]"
            >
              Započni besplatnu probu
            </Link>
          </div>
        </StaggerItem>
      </Stagger>

      <Reveal className="mt-12">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold text-blue-700">Scrolly-telling</p>
            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
              Pokažimo vrijednost u akciji
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)] md:text-base">
              Kako skrolate, desno se mijenja “mini demo” i vizualno potvrđuje ono što čitate.
            </p>
          </div>
          <div className="mt-8">
            <FeatureStoryScroller />
          </div>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Reveal>
          <Card className="card card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI-first princip
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              AI nikad ne “mijenja istinu” bez potvrde korisnika: prijedlozi su vidljivi,
              reverzibilni i (idealno) auditabilni.
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="card card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Sigurnost i privatnost
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              FiskAI treba imati jasan “Trust Center”: gdje su podaci, koliko se čuvaju, kako se
              izvoze i brišu te kako radi AI obrada.
              <div className="mt-3">
                <Link
                  href="/security"
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Pročitaj više
                </Link>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="card card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Računi (core)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Kreiranje, slanje i praćenje računa, statusi, kupci, artikli, predlošci i izvozi.
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="card card-hover h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanText className="h-5 w-5 text-blue-600" />
                Troškovi + skeniranje
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Skenirajte račun, automatski izvucite podatke i potvrdite unos (AI/OCR).
            </CardContent>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-2">
          <Card className="card card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-blue-600" />
                E-računi i fiskalizacija 2.0 (u razvoju)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Priprema za integraciju s informacijskim posrednicima (npr. IE-Računi) i praćenje
              statusa e-računa.
            </CardContent>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-2">
          <Card className="card card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Suradnja s knjigovođom
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Izvozi i audit trag omogućuju suradnju bez “fascikla” i ručnog prepisivanja.
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  )
}
