import { redirect } from "next/navigation"

export default function StaffRootPage() {
  // Redirect staff root to the dashboard
  redirect("/staff-dashboard")
}
