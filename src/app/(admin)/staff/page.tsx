import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Users } from "lucide-react"

// TODO: Create StaffManagement component in Phase 6
// import { StaffManagement } from "@/components/admin/staff-management"

function StaffManagementPlaceholder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">Manage internal accountants and staff members</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Staff management will be available in Phase 6</p>
          <p className="text-sm text-muted-foreground mt-2">
            This page will allow you to create and manage staff accounts and assign them to clients
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function StaffPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StaffManagementPlaceholder />
    </Suspense>
  )
}
