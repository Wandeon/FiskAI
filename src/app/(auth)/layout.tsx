import { ReactNode } from "react"
import Link from "next/link"
import { KeyRound, ShieldCheck, Sparkles, Download } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto grid min-h-screen max-w-6xl items-stretch gap-8 px-4 py-10 md:grid-cols-2 md:gap-10 md:px-6">
        <aside className="hidden md:flex">
          <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 p-10 text-white shadow-glow">
            <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_20%_20%,rgba(96,165,250,0.35),transparent_55%),radial-gradient(700px_circle_at_80%_10%,rgba(99,102,241,0.35),transparent_52%)]" />
            <div className="relative flex h-full flex-col">
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">FiskAI</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  beta
                </span>
              </Link>

              <h1 className="mt-10 text-display text-4xl font-semibold">
                Premium ulaz u AI-first računovodstvo.
              </h1>
              <p className="mt-4 text-white/85">
                Brži unos troškova, uredni izvozi i kontrola nad podacima — dizajnirano za Hrvatsku.
              </p>

              <div className="mt-8 grid gap-4">
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
                  <KeyRound className="mt-0.5 h-5 w-5 text-white/90" />
                  <div>
                    <p className="text-sm font-semibold">Passkeys + sigurnost</p>
                    <p className="text-sm text-white/80">
                      Moderni login bez lozinki (gdje je moguće), uz audit trag promjena.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
                  <Sparkles className="mt-0.5 h-5 w-5 text-white/90" />
                  <div>
                    <p className="text-sm font-semibold">AI uz vašu kontrolu</p>
                    <p className="text-sm text-white/80">
                      AI predlaže, vi potvrđujete — ništa se ne mijenja “u tišini”.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
                  <Download className="mt-0.5 h-5 w-5 text-white/90" />
                  <div>
                    <p className="text-sm font-semibold">Izvoz bez lock-ina</p>
                    <p className="text-sm text-white/80">
                      CSV/Excel/PDF izvozi i “paket za knjigovođu” kad god poželite.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-white/90" />
                  <div>
                    <p className="text-sm font-semibold">Trust Center</p>
                    <p className="text-sm text-white/80">
                      GDPR, rezidencija podataka i status sustava na jednom mjestu.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-10 text-xs text-white/75">
                <p>
                  Trebate pomoć?{" "}
                  <Link
                    href="/contact"
                    className="font-semibold text-white underline underline-offset-4"
                  >
                    Kontakt
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex flex-col justify-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 md:hidden">
            <span className="text-sm font-semibold tracking-tight">FiskAI</span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
              beta
            </span>
          </Link>

          <div className="w-full max-w-md">{children}</div>

          <div className="mt-6 text-xs text-[var(--muted)]">
            <Link href="/terms" className="hover:text-[var(--foreground)]">
              Uvjeti korištenja
            </Link>{" "}
            <span className="px-2">·</span>
            <Link href="/privacy" className="hover:text-[var(--foreground)]">
              Privatnost
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
