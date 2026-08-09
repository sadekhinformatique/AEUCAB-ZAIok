"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { RefreshCw, CloudOff, AlertTriangle, CheckCircle2, Filter, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatDateTime } from "@/lib/sgiau/format"
import { toast } from "sonner"

interface SyncMetaItem {
  id: string
  lastSyncAt: string | null
  syncStatus: string
  revision: number
  updatedAt: string
  member: { id: string; matricule: string; firstName: string; lastName: string; status: string }
}

interface SyncLogItem {
  id: string
  direction: string
  entity: string
  entityId: string
  status: string
  message: string | null
  createdAt: string
}

const SYNC_COLORS: Record<string, string> = {
  SYNCED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  CONFLICT: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

const LOG_COLORS: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CONFLICT: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  ERROR: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

export default function SyncModule() {
  const [metas, setMetas] = useState<SyncMetaItem[]>([])
  const [logs, setLogs] = useState<SyncLogItem[]>([])
  const [stats, setStats] = useState({ synced: 0, pending: 0, conflicts: 0, lastSyncAt: null as string | null })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/sync")
      const data = await res.json()
      setMetas(data.syncMetas || [])
      setLogs(data.recentLogs || [])
      setStats(data.stats || { synced: 0, pending: 0, conflicts: 0, lastSyncAt: null })
    } catch {
      toast.error("Échec du chargement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function runSync() {
    setRunning(true)
    try {
      const res = await fetch("/api/sync/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(data.message || `${data.synced} entrée(s) synchronisée(s)`)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  async function simulateConflict() {
    setRunning(true)
    try {
      const res = await fetch("/api/sync/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ simulate: true }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Conflit simulé")
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const filtered = statusFilter === "ALL" ? metas : metas.filter((m) => m.syncStatus === statusFilter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Synchronisation hors-ligne"
        description="Synchronisation entre l'application desktop (SQLite local) et le serveur central"
        icon={RefreshCw}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={simulateConflict} disabled={running} className="gap-2">
              <AlertTriangle className="h-4 w-4" /> Simuler un conflit
            </Button>
            <Button size="sm" onClick={runSync} disabled={running} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} /> Synchroniser maintenant
            </Button>
          </>
        }
      />

      {/* Explanation card */}
      <SectionCard title="Mode hors-ligne" description="Application desktop — SQLite local synchronisé avec le serveur">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-100">
          <CloudOff className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Fonctionnement hors-ligne</p>
            <p className="text-xs mt-1 text-cyan-800/80 dark:text-cyan-200/80">
              L'application desktop fonctionne en mode déconnecté: les données sont stockées localement dans une base SQLite embarquée.
              Au retour de la connexion, les modifications sont poussées vers le serveur central (PUSH) et les mises à jour distantes sont tirées (PULL).
              Chaque entité possède une métadonnée de révision pour détecter les conflits.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Membres synchronisés" value={stats.synced} icon={CheckCircle2} tone="success" />
        <StatCard title="En attente" value={stats.pending} icon={RefreshCw} tone="warning" />
        <StatCard title="Conflits" value={stats.conflicts} icon={AlertTriangle} tone="danger" />
        <StatCard
          title="Dernière synchro"
          value={stats.lastSyncAt ? formatDateTime(stats.lastSyncAt) : "Jamais"}
          icon={Zap}
          tone="info"
        />
      </div>

      <SectionCard
        title="Métadonnées de synchronisation"
        description="État de chaque entité membre"
        actions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="SYNCED">Synchronisés</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="CONFLICT">Conflits</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        {loading ? (
          <LoadingState rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={RefreshCw} title="Aucune entrée" description="Aucune entrée de synchronisation ne correspond." />
        ) : (
          <div className="rounded-lg border max-h-96 overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead className="hidden md:table-cell">Révision</TableHead>
                  <TableHead className="hidden md:table-cell">Dernière synchro</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{m.member.firstName} {m.member.lastName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.member.matricule}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">v{m.revision}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{m.lastSyncAt ? formatDateTime(m.lastSyncAt) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={SYNC_COLORS[m.syncStatus]}>{m.syncStatus}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Journal des synchronisations" description="50 derniers événements PUSH / PULL">
        {loading ? (
          <LoadingState rows={6} />
        ) : logs.length === 0 ? (
          <EmptyState icon={RefreshCw} title="Aucun événement" description="Lancez une synchronisation pour voir des événements." />
        ) : (
          <div className="rounded-lg border max-h-96 overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(l.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline" className={l.direction === "PUSH" ? "bg-amber-50 text-amber-700" : "bg-cyan-50 text-cyan-700"}>{l.direction}</Badge></TableCell>
                    <TableCell className="text-sm">{l.entity} <span className="text-[10px] text-muted-foreground font-mono">{l.entityId.slice(-6)}</span></TableCell>
                    <TableCell><Badge variant="outline" className={LOG_COLORS[l.status]}>{l.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[280px]">{l.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
