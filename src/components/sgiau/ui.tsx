"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="rounded-xl bg-primary/10 text-primary p-2.5">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "default",
  loading,
  onClick,
}: {
  title: string
  value: ReactNode
  icon: LucideIcon
  hint?: string
  tone?: "default" | "success" | "warning" | "danger" | "info"
  loading?: boolean
  onClick?: () => void
}) {
  const tones: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    info: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  }
  return (
    <Card onClick={onClick} className={cn(onClick && "cursor-pointer hover:shadow-md transition-shadow")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn("rounded-lg p-2", tones[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={className}>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            {description && <CardDescription className="text-xs mt-1">{description}</CardDescription>}
          </div>
          {actions}
        </CardHeader>
      )}
      <CardContent className={cn("p-4 pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function StatusBadge({ label, className }: { label: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium border-0", className)}>
      {label}
    </Badge>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function Money({ value, className }: { value: number | null | undefined; className?: string }) {
  const v = Number(value ?? 0)
  return (
    <span className={cn("tabular-nums", className)}>
      {v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} <span className="text-muted-foreground text-xs">FCFA</span>
    </span>
  )
}
