"use client"

import { useEffect, useId, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as Popover from "@radix-ui/react-popover"
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronDown,
  FileText,
  Menu,
  Newspaper,
  Shield,
  Sparkles,
  Wrench,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ComplianceTrafficLight } from "./ComplianceTrafficLight"

type NavItem = { href: string; label: string }
type NavMenuItem = {
  href: string
  label: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
}

const PRODUCT_MENU: NavMenuItem[] = [
  {
    href: "/features",
    label: "Mogućnosti",
    description: "Što FiskAI radi — računi, OCR, banke, izvještaji.",
    icon: Sparkles,
  },
  {
    href: "/security",
    label: "Sigurnost",
    description: "GDPR, passkeys, audit trag i EU hosting.",
    icon: Shield,
  },
  {
    href: "/prelazak",
    label: "Prijeđi na FiskAI",
    description: "Migracija u par koraka — bez stresa.",
    icon: ArrowRight,
  },
]

const TOOLS_MENU: NavMenuItem[] = [
  {
    href: "/alati",
    label: "Svi alati",
    description: "Kalkulatori i pomoćni alati za poduzetnike.",
    icon: Wrench,
  },
  {
    href: "/alati/pdv-kalkulator",
    label: "PDV prag",
    description: "Koliko ste blizu 60.000€ i što se mijenja.",
    icon: Calculator,
  },
  {
    href: "/alati/kalendar",
    label: "Kalendar rokova",
    description: "Rokovi, podsjetnici i usklađenost.",
    icon: FileText,
  },
  {
    href: "/alati/posd-kalkulator",
    label: "PO‑SD kalkulator",
    description: "Izračun doprinosa i poreza (paušalni obrt).",
    icon: Calculator,
  },
  {
    href: "/alati/oib-validator",
    label: "OIB validator",
    description: "Provjera OIB-a i osnovnih podataka.",
    icon: Shield,
  },
]

const KNOWLEDGE_MENU: NavMenuItem[] = [
  {
    href: "/baza-znanja",
    label: "Baza znanja",
    description: "Sve teme na jednom mjestu — vodiči, usporedbe, kako‑da.",
    icon: BookOpen,
  },
  {
    href: "/vodic",
    label: "Vodiči",
    description: "Paušalni obrt, obrt na dohodak, d.o.o. i obveze.",
    icon: BookOpen,
  },
  {
    href: "/usporedba",
    label: "Usporedbe",
    description: "Usporedite opcije uz tablice i kalkulatore.",
    icon: Calculator,
  },
  {
    href: "/kako-da",
    label: "Kako da",
    description: "Praktični koraci i predlošci za najčešće situacije.",
    icon: FileText,
  },
  {
    href: "/rjecnik",
    label: "Rječnik",
    description: "Pojmovi i objašnjenja bez žargona.",
    icon: BookOpen,
  },
  {
    href: "/izvori",
    label: "Službeni izvori",
    description: "Linkovi na relevantne institucije i propise.",
    icon: Shield,
  },
]

const PRIMARY_LINKS: NavItem[] = [
  { href: "/vijesti", label: "Vijesti" },
  { href: "/pricing", label: "Cijene" },
  { href: "/contact", label: "Kontakt" },
]

function NavLink({ href, label }: NavItem & { label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`))

  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors",
        isActive ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
      )}
    >
      {label}
    </Link>
  )
}

function isMenuActive(pathname: string | null, items: NavMenuItem[]) {
  if (!pathname) return false
  return items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
}

function NavMenu({
  label,
  items,
  className,
  align = "start",
}: {
  label: string
  items: NavMenuItem[]
  className?: string
  align?: "start" | "center" | "end"
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const active = isMenuActive(pathname, items)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
            active
              ? "text-[var(--foreground)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]",
            "hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2",
            className
          )}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {label}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          align={align}
          className={cn(
            "z-50 w-[min(92vw,380px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-card",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          <div className="grid gap-1">
            {items.map((item) => {
              const Icon = item.icon
              const itemActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(`${item.href}/`))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl px-3 py-2 transition-colors",
                    "hover:bg-[var(--surface-secondary)]",
                    itemActive && "bg-[var(--surface-secondary)]"
                  )}
                >
                  {Icon ? (
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
                      <Icon className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--muted)]">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {item.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      {item.description}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function LinkButton({
  href,
  variant = "default",
  children,
}: {
  href: string
  variant?: "default" | "outline"
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "btn-press inline-flex min-h-[44px] items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:min-h-0",
        variant === "default" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "outline" &&
          "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]"
      )}
    >
      {children}
    </Link>
  )
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open])

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--glass-surface)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Row 1: Brand + actions */}
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="text-base font-semibold tracking-tight">FiskAI</span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              beta
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ComplianceTrafficLight className="hidden lg:block" />
            <LinkButton href="/login" variant="outline">
              Prijava
            </LinkButton>
            <LinkButton href="/register">Započni</LinkButton>
            <button
              type="button"
              className="btn-press inline-flex min-h-[44px] items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] hover:bg-[var(--surface-secondary)] md:hidden"
              aria-label={open ? "Zatvori izbornik" : "Otvori izbornik"}
              aria-controls={panelId}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Row 2: Navigation (desktop) */}
        <div className="hidden items-center justify-between pb-3 md:flex">
          <nav className="flex items-center gap-1" aria-label="Glavna navigacija">
            <NavMenu label="Proizvod" items={PRODUCT_MENU} />
            <NavMenu label="Alati" items={TOOLS_MENU} />
            <NavMenu label="Baza znanja" items={KNOWLEDGE_MENU} />
            {PRIMARY_LINKS.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          <Link
            href="/fiskalizacija"
            className={cn(
              "group inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors",
              "hover:bg-red-500/15"
            )}
          >
            <FileText className="h-4 w-4" />
            Fiskalizacija 2.0
            <ArrowRight className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div
        id={panelId}
        className={cn(
          "md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
          "relative z-30"
        )}
      >
        <div
          className={cn(
            "fixed inset-0 bg-black/40 transition-opacity",
            open ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-[min(92vw,360px)] border-l border-[var(--border)] bg-[var(--surface)] shadow-elevated transition-transform",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold">Navigacija</p>
            <button
              type="button"
              className="btn-press inline-flex min-h-[44px] items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 hover:bg-[var(--surface-secondary)]"
              aria-label="Zatvori izbornik"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-3 px-4 py-4" aria-label="Mobilna navigacija">
            <MobileSection
              title="Proizvod"
              items={PRODUCT_MENU}
              icon={<Sparkles className="h-4 w-4 text-blue-600" />}
              onNavigate={() => setOpen(false)}
            />
            <MobileSection
              title="Alati"
              items={TOOLS_MENU}
              icon={<Wrench className="h-4 w-4 text-blue-600" />}
              onNavigate={() => setOpen(false)}
              defaultOpen
            />
            <MobileSection
              title="Baza znanja"
              items={KNOWLEDGE_MENU}
              icon={<BookOpen className="h-4 w-4 text-blue-600" />}
              onNavigate={() => setOpen(false)}
            />

            <div className="grid gap-1">
              <Link
                href="/vijesti"
                onClick={() => setOpen(false)}
                className="list-item-interactive font-medium"
              >
                <Newspaper className="h-4 w-4 text-[var(--muted)]" />
                Vijesti
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="list-item-interactive font-medium"
              >
                <Calculator className="h-4 w-4 text-[var(--muted)]" />
                Cijene
              </Link>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="list-item-interactive font-medium"
              >
                <FileText className="h-4 w-4 text-[var(--muted)]" />
                Kontakt
              </Link>
            </div>

            <div className="mt-2 grid gap-2 border-t border-[var(--border)] pt-4">
              <LinkButton href="/login" variant="outline">
                Prijava
              </LinkButton>
              <LinkButton href="/register">Započni besplatno</LinkButton>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

function MobileSection({
  title,
  items,
  icon,
  onNavigate,
  defaultOpen = false,
}: {
  title: string
  items: NavMenuItem[]
  icon?: React.ReactNode
  onNavigate: () => void
  defaultOpen?: boolean
}) {
  return (
    <details
      className="group rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      defaultOpen={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          {icon}
          {title}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--border)] px-2 py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="list-item-interactive"
          >
            <span className="flex-1">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </details>
  )
}
