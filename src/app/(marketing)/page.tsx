import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle2,
  FileText,
  ScanText,
  Shield,
  Sparkles,
  ArrowRight,
  Calculator,
  Receipt,
  Calendar,
  HelpCircle,
  BookOpen,
  Scale,
  Building2,
  Briefcase,
  TrendingUp,
} from "lucide-react"

export default async function MarketingHomePage() {
  const session = await auth()
  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div>
      <section className="surface-gradient">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] md:items-center">
            <div className="space-y-6">
              <h1 className="text-display text-4xl font-semibold md:text-5xl">
                AI-first računovodstvo koje ostaje u vašim rukama.
              </h1>
              <p className="max-w-xl text-base/7 text-white/85">
                FiskAI pomaže izdavati račune, skupljati troškove i pripremati podatke za knjigovođu
                — bez slanja mailova i bez &quot;donosim fascikl&quot;.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-white/95"
                >
                  Započni besplatno
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Zatraži demo
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Hrvatski UI i terminologija
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Fokus na fiskalizaciju / e-račune
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> AI za ubrzanje unosa troškova
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="border-white/15 bg-white/10 text-white shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">Što je &quot;uspjeh&quot; u 10 minuta?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/85">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4" />
                    <p>Kreirajte tvrtku, kupca i prvi račun.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ScanText className="mt-0.5 h-4 w-4" />
                    <p>Skenirajte prvi račun/trošak i spremite ga.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4" />
                    <p>Dobijte prijedloge kategorija i provjerite ih.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/15 bg-white/10 text-white shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">Transparentno: FiskAI je u beta fazi</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-white/85">
                  Fokus je na brzom “time-to-value” za male tvrtke, uz postepeno proširenje na punu
                  ERP funkcionalnost.
                  <div className="mt-3">
                    <Link
                      href="/features"
                      className="text-sm font-semibold text-white underline underline-offset-4"
                    >
                      Pogledaj mogućnosti
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="card card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Računi i e-računi
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Izdavanje, slanje i praćenje računa uz jasan status i audit trag.
            </CardContent>
          </Card>

          <Card className="card card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanText className="h-5 w-5 text-blue-600" />
                Troškovi + skeniranje
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Slikajte račun, izvucite podatke i potvrdite unos u par klikova.
            </CardContent>
          </Card>

          <Card className="card card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Sigurnost i kontrola
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              Podaci pripadaju klijentu: izvoz, audit log i jasna pravila obrade.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Knowledge Hub - Wizard CTA Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="space-y-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium">
                <HelpCircle className="h-4 w-4" />
                Centar znanja
              </div>
              <h2 className="text-3xl font-bold md:text-4xl">
                Ne znate koji oblik poslovanja vam treba?
              </h2>
              <p className="text-lg text-white/85">
                Paušalni obrt, obrt na dohodak, j.d.o.o., d.o.o.? Odgovorite na 4 jednostavna
                pitanja i saznajte koja opcija je najbolja za vas.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/wizard"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-700 hover:bg-white/95"
                >
                  Pokreni čarobnjak
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/vodic"
                  className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Pregledaj vodiče
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link href="/usporedba/pocinjem-solo" className="group">
                <div className="rounded-xl bg-white/10 p-5 transition-all hover:bg-white/20">
                  <Briefcase className="mb-3 h-8 w-8 text-white" />
                  <h3 className="font-semibold text-white">Počinjem solo</h3>
                  <p className="mt-1 text-sm text-white/70">Paušal vs obrt vs j.d.o.o.</p>
                </div>
              </Link>
              <Link href="/usporedba/dodatni-prihod" className="group">
                <div className="rounded-xl bg-white/10 p-5 transition-all hover:bg-white/20">
                  <TrendingUp className="mb-3 h-8 w-8 text-white" />
                  <h3 className="font-semibold text-white">Dodatni prihod</h3>
                  <p className="mt-1 text-sm text-white/70">Uz posao ili mirovinu</p>
                </div>
              </Link>
              <Link href="/usporedba/firma" className="group">
                <div className="rounded-xl bg-white/10 p-5 transition-all hover:bg-white/20">
                  <Building2 className="mb-3 h-8 w-8 text-white" />
                  <h3 className="font-semibold text-white">Osnivam firmu</h3>
                  <p className="mt-1 text-sm text-white/70">j.d.o.o. vs d.o.o.</p>
                </div>
              </Link>
              <Link href="/usporedba/preko-praga" className="group">
                <div className="rounded-xl bg-white/10 p-5 transition-all hover:bg-white/20">
                  <Scale className="mb-3 h-8 w-8 text-white" />
                  <h3 className="font-semibold text-white">Prelazim 60.000€</h3>
                  <p className="mt-1 text-sm text-white/70">PDV obveza i opcije</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Guides Preview Section */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-display text-3xl font-semibold">Vodiči za poslovanje</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--muted)]">
            Detaljni vodiči o svakom obliku poslovanja u Hrvatskoj — porezi, doprinosi, registracija
            i obveze.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link href="/vodic/pausalni-obrt" className="group">
            <Card className="card h-full transition-all group-hover:shadow-lg group-hover:border-blue-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Paušalni obrt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--muted)]">
                  Najjednostavniji oblik. Do 60.000€ prihoda.
                </p>
                <p className="mt-2 text-xs font-medium text-blue-600 group-hover:underline">
                  Saznaj više →
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vodic/obrt-dohodak" className="group">
            <Card className="card h-full transition-all group-hover:shadow-lg group-hover:border-blue-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Obrt na dohodak</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--muted)]">Realni troškovi, PDV odbici.</p>
                <p className="mt-2 text-xs font-medium text-blue-600 group-hover:underline">
                  Saznaj više →
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vodic/doo" className="group">
            <Card className="card h-full transition-all group-hover:shadow-lg group-hover:border-blue-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">D.O.O.</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--muted)]">Ograničena odgovornost, više opcija.</p>
                <p className="mt-2 text-xs font-medium text-blue-600 group-hover:underline">
                  Saznaj više →
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vodic/freelancer" className="group">
            <Card className="card h-full transition-all group-hover:shadow-lg group-hover:border-blue-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Freelancer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--muted)]">IT, dizajn, inozemni klijenti.</p>
                <p className="mt-2 text-xs font-medium text-blue-600 group-hover:underline">
                  Saznaj više →
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vodic/posebni-oblici" className="group">
            <Card className="card h-full transition-all group-hover:shadow-lg group-hover:border-blue-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Posebni oblici</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--muted)]">OPG, slobodna profesija, udruga.</p>
                <p className="mt-2 text-xs font-medium text-blue-600 group-hover:underline">
                  Saznaj više →
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Free Tools Section */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-display text-3xl font-semibold">Besplatni alati</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--muted)]">
              Koristite naše besplatne alate za izračun poreza, generiranje uplatnica i praćenje
              rokova.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Link href="/alati/pdv-kalkulator" className="group">
              <Card className="card h-full transition-all group-hover:shadow-lg group-hover:border-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    PDV Kalkulator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--muted)] mb-3">
                    Izračunajte PDV, doprinose i neto prihod za različite oblike poslovanja.
                  </p>
                  <span className="text-sm font-medium text-blue-600 group-hover:underline">
                    Otvori kalkulator →
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/alati/uplatnice" className="group">
              <Card className="card h-full transition-all group-hover:shadow-lg group-hover:border-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    Generator uplatnica
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--muted)] mb-3">
                    Generirajte HUB3 uplatnice za doprinose, porez i druge obveze s barkodom.
                  </p>
                  <span className="text-sm font-medium text-blue-600 group-hover:underline">
                    Generiraj uplatnicu →
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/alati/kalendar" className="group">
              <Card className="card h-full transition-all group-hover:shadow-lg group-hover:border-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Kalendar rokova
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--muted)] mb-3">
                    Pratite sve porezne rokove — doprinosi, PDV prijave, godišnji izvještaji.
                  </p>
                  <span className="text-sm font-medium text-blue-600 group-hover:underline">
                    Pogledaj rokove →
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials & Trust Section */}
      <section className="bg-gradient-to-b from-white to-blue-50">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-display text-3xl font-semibold">
              Pouzdano od strane obrtnika i knjigovođa
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--muted)]">
              FiskAI pomaže paušalnim obrtnicima, VAT obrtima i knjigovođama u cijeloj Hrvatskoj.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    MK
                  </div>
                  <div>
                    <p className="font-semibold">Marko K.</p>
                    <p className="text-xs text-[var(--muted)]">Paušalni obrt, IT usluge</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)] italic mb-4">
                &quot;Prije sam trošio 5-6 sati mjesečno na administraciju. Sada mi treba sat
                vremena za sve. Izvoz za knjigovođu je game-changer.&quot;
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                    AK
                  </div>
                  <div>
                    <p className="font-semibold">Ana K.</p>
                    <p className="text-xs text-[var(--muted)]">Knjigovođa, računovodstveni ured</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)] italic mb-4">
                &quot;Klijenti mi šalju uredne izvozne pakete umjesto fotografija računa. Smanjuje
                vrijeme obrade za 70% i eliminira greške pri prepisivanju.&quot;
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                    IP
                  </div>
                  <div>
                    <p className="font-semibold">Ivan P.</p>
                    <p className="text-xs text-[var(--muted)]">VAT obrt, građevinarstvo</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)] italic mb-4">
                &quot;AI OCR za skeniranje računa je nevjerojatan. Uštedio mi je 10-15 sati mjesečno
                na unosu troškova. Priprema za e-račune je plus za budućnost.&quot;
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">500+</p>
                <p className="text-xs text-[var(--muted)]">Izdanih računa mjesečno</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">80%</p>
                <p className="text-xs text-[var(--muted)]">Manje vremena na administraciju</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">100%</p>
                <p className="text-xs text-[var(--muted)]">GDPR usklađeno</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">24h</p>
                <p className="text-xs text-[var(--muted)]">Vrijeme odgovora podrške</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="space-y-4">
              <h2 className="text-display text-3xl font-semibold">
                Za paušalni obrt: jednostavno i kompletno
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Cilj je da najjednostavniji korisnici dobiju sve što im treba: izdavanje računa,
                evidenciju troškova i “paket za knjigovođu” bez ručnog rada.
              </p>
              <div className="pt-2">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Pogledaj cijene
                </Link>
              </div>
            </div>
            <Card className="card">
              <CardHeader>
                <CardTitle className="text-lg">Što dobivate odmah</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[var(--muted)]">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" /> Brzi onboarding s
                  checklistom
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" /> OCR + AI prijedlozi
                  kategorija za troškove
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" /> Izvoz podataka (računi,
                  troškovi, kontakti)
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" /> Priprema za e-račune /
                  fiskalizaciju 2.0
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
