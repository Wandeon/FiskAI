"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"

// Calmer, professional palette for dashboard
const dashboardColors = [
  "#3b82f6", // Blue 500
  "#0ea5e9", // Sky 500
  "#06b6d4", // Cyan 500
  "#6366f1", // Indigo 500
]

// Generate random orb configurations
function generateOrbs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: 400 + Math.random() * 400, // Large, soft blobs
    x: Math.random() * 100, // % position
    y: Math.random() * 100,
    duration: 40 + Math.random() * 20, // Very slow (40-60s)
    delay: Math.random() * -40,
  }))
}

export function DashboardBackground() {
  // Generate orbs once on mount
  const orbs = useMemo(() => generateOrbs(4), []) // Fewer orbs for less distraction

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden bg-[var(--background)] pointer-events-none"
      aria-hidden="true"
    >
      {/* Floating orbs */}
      {orbs.map((orb, index) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full mix-blend-multiply dark:mix-blend-screen opacity-[0.07] dark:opacity-[0.12]"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            transform: "translate(-50%, -50%)",
            filter: "blur(80px)",
            backgroundColor: dashboardColors[index % dashboardColors.length],
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -50, 30, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "linear", // Smooth, non-stop motion
            delay: orb.delay,
          }}
        />
      ))}

      {/* Noise texture overlay for premium feel (optional, keeps it subtle) */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
