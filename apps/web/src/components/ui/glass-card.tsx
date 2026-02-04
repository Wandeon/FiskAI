import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "hover" | "gradient"
}

export function GlassCard({ children, className, variant = "default" }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
        variant === "hover" && "transition-all hover:bg-white/10 hover:border-white/20",
        variant === "gradient" && "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20",
        className
      )}
    >
      {children}
    </div>
  )
}
