"use client"

import { lazy, ComponentType, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ALL_MODULE_IDS } from "@/lib/sgiau/constants"

const loaders: Record<string, () => Promise<{ default: ComponentType }>> = {
  dashboard: () => import("@/components/sgiau/modules/dashboard"),
  statistics: () => import("@/components/sgiau/modules/statistics"),
  search: () => import("@/components/sgiau/modules/search"),
  members: () => import("@/components/sgiau/modules/members"),
  adhesion: () => import("@/components/sgiau/modules/adhesion"),
  cards: () => import("@/components/sgiau/modules/cards"),
  cotisations: () => import("@/components/sgiau/modules/cotisations"),
  receipts: () => import("@/components/sgiau/modules/receipts"),
  finance: () => import("@/components/sgiau/modules/finance"),
  cash: () => import("@/components/sgiau/modules/cash"),
  expenses: () => import("@/components/sgiau/modules/expenses"),
  activities: () => import("@/components/sgiau/modules/activities"),
  meetings: () => import("@/components/sgiau/modules/meetings"),
  presences: () => import("@/components/sgiau/modules/presences"),
  elections: () => import("@/components/sgiau/modules/elections"),
  votes: () => import("@/components/sgiau/modules/votes"),
  sport: () => import("@/components/sgiau/modules/sport"),
  publications: () => import("@/components/sgiau/modules/publications"),
  documents: () => import("@/components/sgiau/modules/documents"),
  inventory: () => import("@/components/sgiau/modules/inventory"),
  formations: () => import("@/components/sgiau/modules/formations"),
  library: () => import("@/components/sgiau/modules/library"),
  partners: () => import("@/components/sgiau/modules/partners"),
  archives: () => import("@/components/sgiau/modules/archives"),
  notifications: () => import("@/components/sgiau/modules/notifications"),
  "import-export": () => import("@/components/sgiau/modules/import-export"),
  users: () => import("@/components/sgiau/modules/users"),
  audit: () => import("@/components/sgiau/modules/audit"),
  sync: () => import("@/components/sgiau/modules/sync"),
}

const loaded: Record<string, ComponentType> = {}
for (const id of ALL_MODULE_IDS) {
  loaded[id] = lazy(loaders[id])
}

function ModuleSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

export function ModuleRenderer({ moduleId }: { moduleId: string }) {
  const Cmp = loaded[moduleId] ?? loaded.dashboard
  return (
    <Suspense fallback={<ModuleSkeleton />}>
      <Cmp />
    </Suspense>
  )
}
