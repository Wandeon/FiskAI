import { Suspense } from "react"
import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { getCachedTenantList } from "@/lib/cache"
import type { TenantFilters, TenantSort, TenantPagination } from "@/lib/admin/tenant-list"

// Dynamic import for heavy TenantListView component
const TenantListView = dynamic(
  () => import("./tenant-list").then((mod) => ({ default: mod.TenantListView })),
  {
    loading: () => <LoadingSpinner />,
    ssr: true,
  }
)

export const revalidate = 60 // 1 minute cache

interface SearchParams {
  legalForm?: string
  subscriptionStatus?: string
  flags?: string
  hasAlerts?: string
  search?: string
  sortField?: string
  sortOrder?: string
  page?: string
  pageSize?: string
}

export default async function AdminTenantsPage({ searchParams }: { searchParams: SearchParams }) {
  // Parse filters from URL params
  const filters: TenantFilters = {
    legalForm: searchParams.legalForm,
    subscriptionStatus: searchParams.subscriptionStatus,
    flags: searchParams.flags,
    hasAlerts:
      searchParams.hasAlerts === "true"
        ? true
        : searchParams.hasAlerts === "false"
          ? false
          : undefined,
    search: searchParams.search,
  }

  // Parse sort from URL params
  const sort: TenantSort = {
    field: (searchParams.sortField as any) || "createdAt",
    order: (searchParams.sortOrder as any) || "desc",
  }

  // Parse pagination from URL params
  const pagination: TenantPagination = {
    page: parseInt(searchParams.page || "1", 10),
    pageSize: parseInt(searchParams.pageSize || "20", 10),
  }

  // Fetch tenant list with caching
  const result = await getCachedTenantList(filters, sort, pagination)

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TenantListView data={result} />
    </Suspense>
  )
}
