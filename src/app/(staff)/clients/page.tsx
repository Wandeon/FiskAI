import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Building2 } from "lucide-react"

// TODO: Create ClientsList component in Phase 5
// import { ClientsList } from "@/components/staff/clients-list"

function ClientsListPlaceholder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-muted-foreground">Manage your assigned client accounts</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Client list will be available in Phase 5</p>
          <p className="text-sm text-muted-foreground mt-2">
            This page will display all clients assigned to you as a staff member
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ClientsListPlaceholder />
    </Suspense>
  )
}
