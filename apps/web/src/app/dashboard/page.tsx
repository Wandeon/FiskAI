import { redirect } from "next/navigation"

// This route now redirects to the (app) group dashboard
// The actual dashboard is at /app/(app)/dashboard/page.tsx
export default function LegacyDashboardPage() {
  redirect("/onboarding")
}
