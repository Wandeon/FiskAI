"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PortalCardProps {
  href: string
  icon?: React.ReactNode
  title: string
  description?: string
  featured?: boolean
  badge?: string
  onClick?: () => void
  className?: string
}

export function PortalCard({
  href,
  icon,
  title,
  description,
  featured,
  badge,
  onClick,
  className,
}: PortalCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY

    // Calculate rotation (max ±5 degrees)
    const maxRotation = 5
    const rotateYValue = (mouseX / (rect.width / 2)) * maxRotation
    const rotateXValue = -(mouseY / (rect.height / 2)) * maxRotation

    setRotateX(rotateXValue)
    setRotateY(rotateYValue)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
    setIsHovered(false)
  }

  return (
    <motion.div
      style={{ perspective: 1000 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        ref={cardRef}
        href={href}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className={cn("group relative block", className)}
      >
        <motion.div
          className={cn(
            "relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors",
            "hover:border-cyan-400/30 hover:bg-white/10",
            featured && "border-cyan-400/20 bg-cyan-500/10"
          )}
          style={{
            transformStyle: "preserve-3d",
            rotateX,
            rotateY,
          }}
          animate={{
            rotateX,
            rotateY,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          {/* Light reflection effect */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              background: `radial-gradient(
                300px circle at ${isHovered ? "var(--mouse-x, 50%)" : "50%"} ${isHovered ? "var(--mouse-y, 50%)" : "50%"},
                rgba(34, 211, 238, 0.15),
                transparent 60%
              )`,
            }}
          />

          {/* Glow border on hover */}
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(135deg, rgba(34, 211, 238, 0.3), transparent, rgba(99, 102, 241, 0.3))",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
              padding: "1px",
            }}
          />

          <div className="relative z-10 flex items-start gap-3">
            {icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-cyan-400">
                {icon}
              </span>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">{title}</span>
                {badge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <p className="mt-1 text-sm text-white/60 line-clamp-2">{description}</p>
              )}
            </div>

            <ArrowRight className="h-4 w-4 shrink-0 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-cyan-400" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

// Simpler link variant for secondary items
interface PortalLinkProps {
  href: string
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export function PortalLink({ href, children, onClick, className }: PortalLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-all",
        "hover:bg-white/5 hover:text-white",
        className
      )}
    >
      <span className="flex-1">{children}</span>
      <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  )
}
