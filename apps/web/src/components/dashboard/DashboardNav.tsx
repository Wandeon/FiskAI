"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: "Pregled", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kontakti", href: "/contacts", icon: Users },
  { label: "Proizvodi", href: "/products", icon: Package },
  { label: "Racuni", href: "/invoices", icon: FileText },
  { label: "Postavke", href: "/settings", icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        // For settings, match any path that starts with /settings
        const isActive = item.href === "/settings"
          ? pathname.startsWith("/settings")
          : pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {isActive && (
              <motion.div
                layoutId="nav-active-indicator"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 30,
                }}
              />
            )}
            <Icon
              className={`relative z-10 h-5 w-5 transition-colors ${
                isActive ? "text-cyan-400" : "text-white/60 group-hover:text-white"
              }`}
            />
            <span
              className={`relative z-10 transition-colors ${
                isActive ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default DashboardNav
