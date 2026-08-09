"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { UserPlus, Check, X, Search, Filter, ClipboardCheck, UserCheck, Crown, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { ADHESION_STATUS_LABELS, FILIERES, LEVELS, LEVEL_LABELS } from "@/lib/sgiau/constants"
import { formatDate, formatDateTime, initials } from "@/lib/sgiau/format"
import { cn } from "@/lib/utils"

interface AdhesionItem {
  id: string
  status: string
  refusalReason: string | null
  sgValidatedAt: string | null
  presidentValidatedAt: string | null
  createdAt: string
  member: {
    id: string
    matricule: string
    firstName: string
    lastName: string
    sex: string
    faculty: string | null
    level: string | null
    email: string | null
    phone: string | null
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  SG_APPROVED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  PRESIDENT_APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  REFUSED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

const PIPELINE = [
  { key: "PENDING", label: "En attente", icon: ClipboardCheck },
  { key: "SG_APPROVED", label: "Validation secrétaire", icon: UserCheck },
  { key: "PRESIDENT_APPROVED", label: "Validation président", icon: Crown },
  { key: "REFUSED", label: "Refusé", icon: Ban },
]

const emptyForm = {
  firstName: "", lastName: "", sex: "M", phone: "", email: "",
  faculty: "", department: "", level: "", academicYear: "2024-2025",
}

export default function AdhesionModule() {
  const [items, setItems] = useState<AdhesionItem[]>([])
  const [counts, setCounts] = useState({ PENDING: 0, SG_APPROVED: 0, PRESIDENT_APPROVED: 0, REFUSED: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [refuseTarget, setRefuseTarget] = useState<AdhesionItem | null>(null)
  const [refuseReason, setRefuseReason] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    const res = await fetch(`/api/adhesion?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setCounts(data.counts || { PENDING: 0, SG_APPROVED: 0, PRESIDENT_APPROVED: 0, REFUSED: 0 })
    setLoading(false)
  }, [q, status])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Le nom et le prénom sont requis")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/adhesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Demande d'adhésion créée")
      setFormOpen(false)
      setForm(emptyForm)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function advance(a: AdhesionItem, action: "approve_sg" | "approve_president") {
    setBusy(a.id)
    try {
      const res = await fetch(`/api/adhesion/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(action === "approve_sg" ? "Validé par le secrétaire" : "Validé par le président — membre activé, carte & compte créés")
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function refuse() {
    if (!refuseTarget) return
    setBusy(refuseTarget.id)
    try {
      const res = await fetch(`/api/adhesion/${refuseTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refuse", reason: refuseReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Adhésion refusée")
      setRefuseTarget(null)
      setRefuseReason("")
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adhésions — Workflow de validation"
        description="Soumission, validation secrétaire, approbation président et activation des membres"
        icon={UserPlus}
        actions={
          <Button size="sm" onClick={() => { setForm(emptyForm); setFormOpen(true) }} className="gap-2">
            <UserPlus className="h-4 w-4" /> Nouvelle demande
          </Button>
        }
      />

      {/* Pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PIPELINE.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.key} className="relative rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className={cn("rounded-lg p-2", STATUS_COLORS[step.key])}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-2xl font-bold tabular-nums">{counts[step.key as keyof typeof counts] ?? 0}</span>
              </div>
              <p className="text-xs font-medium mt-3">{step.label}</p>
              {i < PIPELINE.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-muted-foreground">→</div>
              )}
            </div>
          )
        })}
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom, matricule, email…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-52"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(ADHESION_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : items.length === 0 ? (
          <EmptyState icon={UserPlus} title="Aucune demande" description="Aucune adhésion ne correspond à vos filtres." />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead className="hidden md:table-cell">Filière / Niveau</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden lg:table-cell">Dates</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(a.member.firstName, a.member.lastName)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{a.member.firstName} {a.member.lastName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{a.member.matricule}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{a.member.faculty ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{a.member.level ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[a.status]}>{ADHESION_STATUS_LABELS[a.status]}</Badge>
                      {a.status === "REFUSED" && a.refusalReason && (
                        <p className="text-xs text-rose-600 mt-1 max-w-[220px]" title={a.refusalReason}>{a.refusalReason}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      <p>Déposée: {formatDate(a.createdAt)}</p>
                      {a.sgValidatedAt && <p>Secrétaire: {formatDate(a.sgValidatedAt)}</p>}
                      {a.presidentValidatedAt && <p>Président: {formatDate(a.presidentValidatedAt)}</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {a.status === "PENDING" && (
                          <>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={busy === a.id} onClick={() => advance(a, "approve_sg")}>
                              <Check className="h-3.5 w-3.5" /> Valider (secrétaire)
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-destructive" disabled={busy === a.id} onClick={() => { setRefuseTarget(a); setRefuseReason("") }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {a.status === "SG_APPROVED" && (
                          <>
                            <Button size="sm" className="h-8 gap-1.5" disabled={busy === a.id} onClick={() => advance(a, "approve_president")}>
                              <Crown className="h-3.5 w-3.5" /> Valider (président)
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-destructive" disabled={busy === a.id} onClick={() => { setRefuseTarget(a); setRefuseReason("") }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {a.status === "PRESIDENT_APPROVED" && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Check className="h-3 w-3 mr-1" /> Adhésion complétée
                          </Badge>
                        )}
                        {a.status === "REFUSED" && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            <Ban className="h-3 w-3 mr-1" /> Refusée
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Create dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>Nouvelle demande d'adhésion</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <Field label="Prénom *"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Nom *"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Sexe">
              <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="M">Homme</SelectItem><SelectItem value="F">Femme</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Année universitaire"><Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></Field>
            <Field label="Filière">
              <Select value={form.faculty} onValueChange={(v) => setForm({ ...form, faculty: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{FILIERES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Département (option)"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="Niveau">
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{LEVEL_LABELS[l]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Déposer la demande"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refuse dialog */}
      <Dialog open={!!refuseTarget} onOpenChange={(o) => !o && setRefuseTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refuser l'adhésion</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {refuseTarget && (
              <p className="text-sm text-muted-foreground">Demande de <span className="font-medium text-foreground">{refuseTarget.member.firstName} {refuseTarget.member.lastName}</span> ({refuseTarget.member.matricule})</p>
            )}
            <Field label="Motif du refus">
              <Input value={refuseReason} onChange={(e) => setRefuseReason(e.target.value)} placeholder="Ex. Dossier incomplet…" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={refuse} disabled={busy === refuseTarget?.id}>Confirmer le refus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}
