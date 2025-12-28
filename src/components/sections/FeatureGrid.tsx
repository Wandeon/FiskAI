"use client"

import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/patterns/SectionHeading"
import { FeatureCard } from "@/components/patterns/FeatureCard"
import { Stagger, StaggerItem } from "@/components/motion/Stagger"

interface FeatureItem {
  icon: LucideIcon
  title: string
  description: string
  href?: string
  iconVariant?: "accent" | "success" | "warning" | "danger" | "info"
}

interface FeatureGridProps {
  /** Optional section label */
  label?: string
  /** Section title */
  title: string
  /** Optional section description */
  description?: string
  /** Feature items */
  items: FeatureItem[]
  /** Number of columns at large breakpoint */
  columns?: 2 | 3 | 4
  /** Center the heading */
  centerHeading?: boolean
  /** Additional classes */
  className?: string
}

const columnClasses = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
}

/**
 * FeatureGrid: Section with heading and grid of feature cards.
 *
 * Composes: SectionHeading + FeatureCard + Stagger animations
 *
 * Note: SectionHeading already includes Reveal animation internally,
 * so we don't wrap it again here.
 */
export function FeatureGrid({
  label,
  title,
  description,
  items,
  columns = 3,
  centerHeading = false,
  className,
}: FeatureGridProps) {
  return (
    <section className={cn("py-24", className)}>
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading
          label={label}
          title={title}
          description={description}
          align={centerHeading ? "center" : "left"}
        />

        <Stagger className={cn("grid gap-6 md:grid-cols-2", columnClasses[columns])}>
          {items.map((item, i) => (
            <StaggerItem key={i}>
              <FeatureCard
                icon={item.icon}
                title={item.title}
                description={item.description}
                href={item.href}
                iconVariant={item.iconVariant}
              />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
