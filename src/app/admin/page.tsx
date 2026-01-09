import { redirect } from "next/navigation"

// Redirect root /admin to /admin/overview
export default function AdminRootPage() {
  redirect("/admin/overview")
}
