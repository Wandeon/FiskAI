"use client"

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { useRef, type ReactNode, type MouseEvent } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // Mouse position relative to card center
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth spring animation for spotlight
  const spotlightX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const spotlightY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  // Subtle 3D tilt effect
  const rotateX = useTransform(mouseY, [-150, 150], [2, -2])
  const rotateY = useTransform(mouseX, [-200, 200], [-2, 2])

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative overflow-hidden rounded-3xl ${className || ""}`}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />

      {/* Gradient border */}
      <div className="absolute inset-0 rounded-3xl border border-white/20" />

      {/* Spotlight glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [spotlightX, spotlightY],
            ([x, y]) =>
              `radial-gradient(400px circle at ${(x as number) + 200}px ${(y as number) + 250}px, rgba(8, 145, 178, 0.15), transparent 60%)`
          ),
        }}
      />

      {/* Inner spotlight (brighter, smaller) */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          background: useTransform(
            [spotlightX, spotlightY],
            ([x, y]) =>
              `radial-gradient(200px circle at ${(x as number) + 200}px ${(y as number) + 250}px, rgba(255, 255, 255, 0.1), transparent 50%)`
          ),
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-8">{children}</div>

      {/* Bottom reflection */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  )
}

export default GlassCard
