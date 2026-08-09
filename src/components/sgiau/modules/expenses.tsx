"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { TrendingDown, Plus, Search, Filter, Download, Check, X, Eye, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { EXPENSE_STATUS_LABELS } from "@/lib/sgiau/constants"
import { formatCurrency, formatDate, formatDateTime, toCSV, downloadCSV } from "@/lib/sgiau/format"

interface ExpenseCategory { id: string; name: string }
interface UserLite { id: string; fullName: string; role: string }

interface Expense {
  id: string; reference: string; label: string; amount: number; date: string; status: string; note: string | null
  justificativeUrl: string | null; createdAt: string; updatedAt: string
  category: { id: string; name: string } | null
  responsible: { id: string; fullName: string; role: string } | null
  validator: { id: string; fullName: string; role: string } | null
  fiscalYear: { id: string; name: string } | null
  activity: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  VALIDATED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

const emptyForm = { label: "", categoryId: "", amount: "0", date: new Date().toISOString().slice(0, 10), responsibleId: "", note: "" }

export default function ExpensesModule() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [users, setUsers] = useState<UserLite[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [catFilter, setCatFilter] = useState("ALL")

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<Expense | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, usersRes] = await Promise.all([
        fetch("/api/expenses?limit=500"),
        fetch("/api/users?limit=100").catch(() => null),
      ])
      const expData = await expRes.json()
      setExpenses(expData.expenses || [])
      setCategories(expData.categories || [])
      if (usersRes?.ok) {
        const u = await usersRes.json()
        setUsers(Array.isArray(u) ? u : (u.items || u.users || []))
      }
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false
      if (catFilter !== "ALL" && e.category?.id !== catFilter) return false
      if (q) {
        const s = q.toLowerCase()
        const full = `${e.reference} ${e.label} ${e.note || ""}`.toLowerCase()
        if (!full.includes(s)) return false
      }
      return true
    })
  }, [expenses, q, statusFilter, catFilter])

  const stats = useMemo(() => ({
    validees: expenses.filter((e) => e.status === "VALIDATED").reduce((s, e) => s + e.amount, 0),
    enAttente: expenses.filter((e) => e.status === "PENDING").length,
    montantAttente: expenses.filter((e) => e.status === "PENDING").reduce((s, e) => s + e.amount, 0),
  }), [expenses])

  function openCreate() { setForm(emptyForm); setFormOpen(true) }

  async function save() {
    if (!form.label.trim()) { toast.error("Le libellé est requis"); return }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Montant invalide"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label.trim(),
          categoryId: form.categoryId || null,
          amount: Number(form.amount),
          date: form.date,
          responsibleId: form.responsibleId || null,
          note: form.note.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Dépense créée")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(exp: Expense, status: "VALIDATED" | "REJECTED") {
    if (status === "VALIDATED" && !confirm(`Valider la dépense ${exp.reference} (${formatCurrency(exp.amount)}) ?`)) return
    setActing(exp.id)
    try {
      const res = await fetch(`/api/expenses/${exp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(status === "VALIDATED" ? "Dépense validée — écriture comptable générée" : "Dépense rejetée")
      load()
      if (detail?.id === exp.id) setDetail(data)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setActing(null)
    }
  }

  function exportCSV() {
    const rows = filtered.map((e) => ({
      reference: e.reference,
      date: formatDate(e.date),
      libelle: e.label,
      categorie: e.category?.name ?? "—",
      montant: e.amount,
      responsable: e.responsible?.fullName ?? "—",
      validateur: e.validator?.fullName ?? "—",
      statut: EXPENSE_STATUS_LABELS[e.status] || e.status,
    }))
    downloadCSV(`depenses-${Date.now()}.csv`, toCSV(rows))
    toast.success(`${rows.length} dépenses exportées`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description="Saisie, validation et suivi des dépenses de l'amicale"
        icon={TrendingDown}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nouvelle dépense
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Dépenses validées" value={<Money value={stats.validees} />} icon={TrendingDown} tone="success" />
        <StatCard title="En attente" value={stats.enAttente} icon={Clock} tone="warning" />
        <StatCard title="Montant en attente" value={<Money value={stats.montantAttente} />} icon={Clock} tone="warning" />
        <StatCard title="Total filtré" value={<Money value={filtered.reduce((s, e) => s + e.amount, 0)} />} icon={TrendingDown} />
      </div>

      <SectionCard title="Liste des dépenses" description={`${filtered.length} dépense(s)`}>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Référence, libellé, note…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              {Object.entries(EXPENSE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes catégories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? <LoadingState rows={8} /> : filtered.length === 0 ? (
          <EmptyState icon={TrendingDown} title="Aucune dépense" description="Créez une première dépense." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle dépense</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="hidden lg:table-cell">Responsable</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => { setDetail(e); setDetailOpen(true) }}>
                    <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                    <TableCell className="font-medium">{e.label}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{e.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums"><Money value={e.amount} /></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{e.responsible?.fullName ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(e.date)}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[e.status]}>{EXPENSE_STATUS_LABELS[e.status] || e.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                        {e.status === "PENDING" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" disabled={acting === e.id} onClick={() => changeStatus(e, "VALIDATED")} title="Valider"><Check className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" disabled={acting === e.id} onClick={() => changeStatus(e, "REJECTED")} title="Rejeter"><X className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDetail(e); setDetailOpen(true) }} title="Voir détail"><Eye className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle dépense</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Libellé *</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex : Achat fournitures bureau" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Catégorie</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v === "NONE" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Aucune —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Montant (FCFA) *</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Responsable</Label>
              <Select value={form.responsibleId} onValueChange={(v) => setForm({ ...form, responsibleId: v === "NONE" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Non assigné —</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Note</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetail(null) }}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto scroll-thin">
          {!detail ? (
            <div className="p-6"><LoadingState rows={4} /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  Détail de la dépense
                </SheetTitle>
                <SheetDescription className="font-mono">{detail.reference}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <Badge variant="outline" className={STATUS_COLORS[detail.status]}>{EXPENSE_STATUS_LABELS[detail.status] || detail.status}</Badge>

                <div>
                  <p className="text-xs text-muted-foreground">Libellé</p>
                  <p className="font-medium text-lg">{detail.label}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Montant" value={formatCurrency(detail.amount)} />
                  <Field label="Date" value={formatDate(detail.date)} />
                  <Field label="Catégorie" value={detail.category?.name ?? "—"} />
                  <Field label="Exercice" value={detail.fiscalYear?.name ?? "—"} />
                  <Field label="Responsable" value={detail.responsible?.fullName ?? "—"} />
                  <Field label="Validateur" value={detail.validator?.fullName ?? "—"} />
                </div>

                {detail.activity && (
                  <div>
                    <p className="text-xs text-muted-foreground">Activité liée</p>
                    <p className="font-medium">{detail.activity.name}</p>
                  </div>
                )}

                {detail.note && (
                  <div>
                    <p className="text-xs text-muted-foreground">Note</p>
                    <p className="mt-1 text-sm">{detail.note}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Créée le {formatDateTime(detail.createdAt)} · Modifiée le {formatDateTime(detail.updatedAt)}
                </div>

                {detail.status === "PENDING" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" className="gap-2 flex-1" disabled={acting === detail.id} onClick={() => changeStatus(detail, "VALIDATED")}>
                      <Check className="h-4 w-4" /> Valider
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 flex-1 text-rose-600 hover:text-rose-700" disabled={acting === detail.id} onClick={() => changeStatus(detail, "REJECTED")}>
                      <X className="h-4 w-4" /> Rejeter
                    </Button>
                  </div>
                )}
                {detail.status === "VALIDATED" && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                    Dépense validée — un mouvement de caisse (sortie) et 2 écritures comptables (débit 60 / crédit 51) ont été générés automatiquement.
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
