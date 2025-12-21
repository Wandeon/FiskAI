import { Skeleton } from "@/components/ui/skeleton"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"

export default function ComplianceLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Certificate Status Card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </div>

      {/* Fiscalization Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <CardSkeleton variant="stat" />
        <CardSkeleton variant="stat" />
        <CardSkeleton variant="stat" />
      </div>

      {/* Business Premises Card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>

      {/* Recent Invoices Card */}
      <div className="card p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
