import { redirect } from "next/navigation"

// Redirect root /staff to /staff/staff-dashboard
export default function StaffRootPage() {
  redirect("/staff/staff-dashboard")
}
