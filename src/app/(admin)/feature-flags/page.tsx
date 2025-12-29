import { getAllFlags } from "@/lib/feature-flags"
import { FeatureFlagsClient } from "./feature-flags-client"

export const metadata = {
  title: "Feature Flags | FiskAI Admin",
  description: "Manage feature flags and rollouts",
}

export default async function FeatureFlagsPage() {
  const flags = await getAllFlags()

  // Group flags by category
  const groupedFlags = flags.reduce(
    (acc, flag) => {
      const category = flag.category || "uncategorized"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(flag)
      return acc
    },
    {} as Record<string, typeof flags>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage feature rollouts, A/B tests, and feature access
          </p>
        </div>
      </div>

      <FeatureFlagsClient initialFlags={flags} groupedFlags={groupedFlags} />
    </div>
  )
}
