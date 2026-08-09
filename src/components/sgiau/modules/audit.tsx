"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { ScrollText, Plus, Search, Filter, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { formatDateTime, initials } from "@/lib/sgiau/format"
import { toast } from "sonner"

interface AuditItem {
  id: string
  action: string
  entity: string
  entityId: string | null
  description: string | null
  createdAt: string
  beforeData: string | null
  afterData: string | null
  user: { id: string; fullName: string; username: string } | null
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  DELETE: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  VALIDATE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  LOGIN: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  EXPORT: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  IMPORT: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200",
  PRINT: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
}

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "VALIDATE", "LOGIN", "EXPORT", "IMPORT", "PRINT"]
const ENTITIES = ["Member", "Adhesion", "Payment", "Receipt", "Expense", "User", "Document", "Activity", "Meeting", "ImportExport", "Notification"]

export default function AuditModule() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [total, setTotal] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [byAction, setByAction] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  const [q, setQ] = useState("")
  const [action, setAction] = useState("ALL")
  const [entity, setEntity] = useState("ALL")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")

  const [detail, setDetail] = useState<(AuditItem & { before: any; after: any }) | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async (reset = true) => {
    setLoading(true)
    if (reset) setItems([])
    const params = new URLSearchParams({ limit: "100" })
    if (q) params.set("q", q)
    if (action !== "ALL") params.set("action", action)
    if (entity !== "ALL") params.set("entity", entity)
    if (start) params.set("start", start)
    if (end) params.set("end", end)
    if (!reset) params.set("offset", String(items.length))
    const res = await fetch(`/api/audit?${params}`)
    const data = await res.json()
    if (reset) setItems(data.items || [])
    else setItems((prev) => [...prev, ...(data.items || [])])
    setTotal(data.total || 0)
    setTodayCount(data.todayCount || 0)
    setByAction(data.byAction || {})
    setHasMore(data.hasMore || false)
    setLoading(false)
  }, [q, action, entity, start, end, items.length])

  useEffect(() => { load(true) }, [q, action, entity, start, end])

  async function openDetail(a: AuditItem) {
    setDetailOpen(true); setDetailLoading(true)
    try {
      const res = await fetch(`/api/audit/${a.id}`)
      const data = await res.json()
      setDetail(data)
    } catch {
      toast.error("Échec du chargement")
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'audit"
        description="Traçabilité complète des actions effectuées dans l'application"
        icon={ScrollText}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total actions" value={total} icon={ScrollText} />
        <StatCard title="Aujourd'hui" value={todayCount} icon={Plus} tone="success" />
        <StatCard title="Modifications" value={(byAction.UPDATE || 0) + (byAction.CREATE || 0)} icon={Filter} tone="info" />
        <StatCard title="Suppressions" value={byAction.DELETE || 0} icon={ScrollText} tone="danger" />
      </div>

      <SectionCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher dans la description…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Toutes actions</SelectItem>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger><SelectValue placeholder="Entité" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Toutes entités</SelectItem>{ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex gap-1">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="text-xs" />
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="text-xs" />
          </div>
        </div>

        {loading ? (
          <LoadingState rows={8} />
        ) : items.length === 0 ? (
          <EmptyState icon={ScrollText} title="Aucune entrée" description="Aucune action ne correspond à vos filtres." />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => openDetail(a)}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(a.user?.fullName?.split(" ")[0] ?? "?", a.user?.fullName?.split(" ")[1] ?? "")}</AvatarFallback></Avatar>
                        <span className="text-sm">{a.user?.fullName ?? "Système"}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={ACTION_COLORS[a.action] ?? "bg-neutral-100 text-neutral-800"}>{a.action}</Badge></TableCell>
                    <TableCell className="text-sm">{a.entity}{a.entityId ? <span className="text-[10px] text-muted-foreground ml-1 font-mono">{a.entityId.slice(-6)}</span> : null}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[280px]">{a.description ?? "—"}</TableCell>
                    <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={() => load(false)}>Charger plus</Button>
          </div>
        )}
      </SectionCard>

      <Sheet open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetail(null) }}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto scroll-thin">
          {detailLoading || !detail ? (
            <div className="p-6"><LoadingState rows={4} /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Badge variant="outline" className={ACTION_COLORS[detail.action]}>{detail.action}</Badge>
                  {detail.entity}
                </SheetTitle>
                <SheetDescription>{detail.description}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Date" value={formatDateTime(detail.createdAt)} />
                  <Info label="Utilisateur" value={detail.user?.fullName ?? "Système"} />
                  <Info label="Entité" value={detail.entity} />
                  <Info label="ID" value={detail.entityId ?? "—"} />
                </div>
                {detail.before && (
                  <SectionCard title="Avant">
                    <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-60 scroll-thin">{JSON.stringify(detail.before, null, 2)}</pre>
                  </SectionCard>
                )}
                {detail.after && (
                  <SectionCard title="Après">
                    <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-60 scroll-thin">{JSON.stringify(detail.after, null, 2)}</pre>
                  </SectionCard>
                )}
                {!detail.before && !detail.after && (
                  <p className="text-sm text-muted-foreground">Aucune donnée before/after enregistrée.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-xs">{value}</p>
    </div>
  )
}
