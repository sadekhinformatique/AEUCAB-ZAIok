"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { Wallet, Plus, Search, Download, Filter, Pencil, FileText, CheckCircle2, Clock, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { COTISATION_KIND_LABELS, PAYMENT_MODE_LABELS, PAYMENT_STATUS_LABELS, FILIERES, LEVELS, LEVEL_LABELS, isAP } from "@/lib/sgiau/constants"
import { formatCurrency, formatDate, formatDateTime, toCSV, downloadCSV } from "@/lib/sgiau/format"
import { useSgiau } from "@/lib/sgiau/store"

interface CotisationType {
  id: string; name: string; kind: string; defaultAmount: number; faculty: string | null
  level: string | null; academicYear: string | null; isActive: boolean; createdAt: string
  _count?: { payments: number }
}

interface Payment {
  id: string; reference: string; memberId: string; amount: number; amountPaid: number
  paymentDate: string; paymentMode: string; status: string; note: string | null; createdAt: string
  member: { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; level: string | null }
  cotisationType: { id: string; name: string; kind: string; defaultAmount: number } | null
  receipt: { id: string; number: string; cancelledAt: string | null } | null
}

interface Member {
  id: string; matricule: string; firstName: string; lastName: string
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  PARTIAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  PENDING: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
}

const emptyTypeForm = { name: "", kind: "ANNUAL", defaultAmount: "5000", faculty: "", level: "", academicYear: "2024-2025", isActive: true }
const emptyPayForm = { memberId: "", cotisationTypeId: "", amount: "0", amountPaid: "0", paymentMode: "CASH", paymentDate: new Date().toISOString().slice(0, 10), note: "" }

export default function CotisationsModule() {
  const { setModule } = useSgiau()
  const [types, setTypes] = useState<CotisationType[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [modeFilter, setModeFilter] = useState("ALL")

  const [typeFormOpen, setTypeFormOpen] = useState(false)
  const [typeForm, setTypeForm] = useState(emptyTypeForm)
  const [typeSaving, setTypeSaving] = useState(false)
  const [editingType, setEditingType] = useState<CotisationType | null>(null)

  const [payFormOpen, setPayFormOpen] = useState(false)
  const [payForm, setPayForm] = useState(emptyPayForm)
  const [paySaving, setPaySaving] = useState(false)

  const [detail, setDetail] = useState<Payment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cotRes, payRes, memRes] = await Promise.all([
        fetch("/api/cotisations"),
        fetch("/api/cotisations/payments?limit=500"),
        fetch("/api/members?limit=500"),
      ])
      const cotData = await cotRes.json()
      const payData = await payRes.json()
      const memData = await memRes.json()
      setTypes(cotData.types || [])
      setPayments(payData || [])
      setMembers(memData || [])
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Filtered payments
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false
      if (modeFilter !== "ALL" && p.paymentMode !== modeFilter) return false
      if (q) {
        const s = q.toLowerCase()
        const full = `${p.reference} ${p.member?.firstName} ${p.member?.lastName} ${p.member?.matricule} ${p.cotisationType?.name || ""}`.toLowerCase()
        if (!full.includes(s)) return false
      }
      return true
    })
  }, [payments, q, statusFilter, modeFilter])

  const stats = useMemo(() => {
    const totalEncaisse = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountPaid, 0)
    const today = new Date().toISOString().slice(0, 10)
    const paiementsJour = payments.filter((p) => p.paymentDate?.slice(0, 10) === today && p.status === "PAID").reduce((s, p) => s + p.amountPaid, 0)
    const partiels = payments.filter((p) => p.status === "PARTIAL").length
    const paids = payments.filter((p) => p.status === "PAID")
    const moy = paids.length ? totalEncaisse / paids.length : 0
    return { totalEncaisse, paiementsJour, partiels, moy }
  }, [payments])

  function openCreateType() {
    setEditingType(null)
    setTypeForm(emptyTypeForm)
    setTypeFormOpen(true)
  }

  function openEditType(t: CotisationType) {
    setEditingType(t)
    setTypeForm({
      name: t.name,
      kind: t.kind,
      defaultAmount: String(t.defaultAmount),
      faculty: t.faculty || "",
      level: t.level || "",
      academicYear: t.academicYear || "",
      isActive: t.isActive,
    })
    setTypeFormOpen(true)
  }

  async function saveType() {
    if (!typeForm.name.trim()) { toast.error("Le nom est requis"); return }
    setTypeSaving(true)
    try {
      const payload = {
        name: typeForm.name.trim(),
        kind: typeForm.kind,
        defaultAmount: Number(typeForm.defaultAmount) || 0,
        faculty: typeForm.faculty || null,
        level: typeForm.level || null,
        academicYear: typeForm.academicYear || null,
        isActive: typeForm.isActive,
      }
      const res = await fetch("/api/cotisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Type de cotisation créé")
      setTypeFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTypeSaving(false)
    }
  }

  function openCreatePayment() {
    setPayForm(emptyPayForm)
    setPayFormOpen(true)
  }

  // When cotisation type changes, auto-fill amount
  function selectCotisation(typeId: string) {
    const t = types.find((x) => x.id === typeId)
    setPayForm((f) => ({
      ...f,
      cotisationTypeId: typeId,
      amount: t ? String(t.defaultAmount) : "0",
      amountPaid: t ? String(t.defaultAmount) : "0",
    }))
  }

  async function savePayment() {
    if (!payForm.memberId) { toast.error("Sélectionnez un membre"); return }
    if (!payForm.amount || Number(payForm.amount) <= 0) { toast.error("Montant invalide"); return }
    setPaySaving(true)
    try {
      const res = await fetch("/api/cotisations/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: payForm.memberId,
          cotisationTypeId: payForm.cotisationTypeId || null,
          amount: Number(payForm.amount),
          amountPaid: Number(payForm.amountPaid),
          paymentMode: payForm.paymentMode,
          paymentDate: payForm.paymentDate,
          note: payForm.note,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(data.receipt ? "Paiement enregistré + reçu émis" : "Paiement enregistré")
      setPayFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPaySaving(false)
    }
  }

  function exportCSV() {
    const rows = filtered.map((p) => ({
      reference: p.reference,
      date: formatDate(p.paymentDate),
      membre: `${p.member?.firstName} ${p.member?.lastName}`,
      matricule: p.member?.matricule,
      cotisation: p.cotisationType?.name ?? "—",
      montant: p.amount,
      paye: p.amountPaid,
      mode: PAYMENT_MODE_LABELS[p.paymentMode] || p.paymentMode,
      statut: PAYMENT_STATUS_LABELS[p.status] || p.status,
    }))
    downloadCSV(`paiements-${Date.now()}.csv`, toCSV(rows))
    toast.success(`${rows.length} paiements exportés`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotisations & Paiements"
        description="Types de cotisations, encaissements et suivi des paiements"
        icon={Wallet}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button size="sm" onClick={openCreatePayment} className="gap-2">
              <Plus className="h-4 w-4" /> Enregistrer un paiement
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total encaissé" value={<Money value={stats.totalEncaisse} />} icon={Wallet} tone="success" />
        <StatCard title="Paiements du jour" value={<Money value={stats.paiementsJour} />} icon={CheckCircle2} tone="info" />
        <StatCard title="Paiements partiels" value={stats.partiels} icon={Clock} tone="warning" />
        <StatCard title="Cotisation moyenne" value={<Money value={stats.moy} />} icon={Coins} />
      </div>

      {/* Section 1 — Types de cotisations */}
      <SectionCard
        title="Types de cotisations"
        description="Définissez les modèles de cotisations disponibles"
        actions={<Button size="sm" variant="outline" onClick={openCreateType} className="gap-2"><Plus className="h-4 w-4" /> Nouveau type</Button>}
      >
        {loading ? <LoadingState rows={4} /> : types.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucun type de cotisation" description="Créez votre premier type." />
        ) : (
          <div className="rounded-lg border max-h-80 overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="hidden md:table-cell">Périmètre</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="text-right">Paiements</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-primary/5">{COTISATION_KIND_LABELS[t.kind] || t.kind}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums"><Money value={t.defaultAmount} /></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {[t.faculty, t.level, t.academicYear].filter(Boolean).join(" · ") || "Tous"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-neutral-100 text-neutral-600"}>
                        {t.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{t._count?.payments ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditType(t)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Section 2 — Paiements */}
      <SectionCard
        title="Paiements"
        description={`${filtered.length} paiement(s)`}
      >
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Référence, membre, matricule…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous modes</SelectItem>
              {Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? <LoadingState rows={8} /> : filtered.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucun paiement" description="Enregistrez un premier paiement." action={<Button onClick={openCreatePayment} className="gap-2"><Plus className="h-4 w-4" /> Enregistrer</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead className="hidden md:table-cell">Cotisation</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="hidden lg:table-cell">Mode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => { setDetail(p); setDetailOpen(true) }}>
                    <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                    <TableCell>
                      <p className="font-medium">{p.member?.firstName} {p.member?.lastName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.member?.matricule}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.cotisationType?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Money value={p.amountPaid} />
                      {p.status === "PARTIAL" && <p className="text-xs text-muted-foreground">/ {formatCurrency(p.amount)}</p>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{PAYMENT_MODE_LABELS[p.paymentMode] || p.paymentMode}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[p.status]}>{PAYMENT_STATUS_LABELS[p.status] || p.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(p.paymentDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Type form dialog */}
      <Dialog open={typeFormOpen} onOpenChange={setTypeFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingType ? "Modifier le type" : "Nouveau type de cotisation"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Nom *</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="Cotisation annuelle 2025-2026" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <Select value={typeForm.kind} onValueChange={(v) => setTypeForm({ ...typeForm, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(COTISATION_KIND_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Montant par défaut (FCFA)</Label>
              <Input type="number" min={0} value={typeForm.defaultAmount} onChange={(e) => setTypeForm({ ...typeForm, defaultAmount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Filière (option)</Label>
              <Select value={typeForm.faculty} onValueChange={(v) => setTypeForm({ ...typeForm, faculty: v === "ALL" ? "" : v, ...(v === "AP" ? { level: "" } : {}) })}>
                <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toutes</SelectItem>
                  {FILIERES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Niveau (option)</Label>
              <Select value={typeForm.level} disabled={isAP(typeForm.faculty)} onValueChange={(v) => setTypeForm({ ...typeForm, level: v === "ALL" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder={isAP(typeForm.faculty) ? "Aucun niveau" : "Tous"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{LEVEL_LABELS[l]}</SelectItem>)}
                </SelectContent>
              </Select>
              {isAP(typeForm.faculty) && <p className="text-xs text-muted-foreground">L'Année Préparatoire n'a pas de niveau.</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Année universitaire</Label>
              <Input value={typeForm.academicYear} onChange={(e) => setTypeForm({ ...typeForm, academicYear: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch checked={typeForm.isActive} onCheckedChange={(c) => setTypeForm({ ...typeForm, isActive: c })} />
              <Label className="text-sm">Type actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeFormOpen(false)}>Annuler</Button>
            <Button onClick={saveType} disabled={typeSaving}>{typeSaving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment form dialog */}
      <Dialog open={payFormOpen} onOpenChange={setPayFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Membre *</Label>
              <Select value={payForm.memberId} onValueChange={(v) => setPayForm({ ...payForm, memberId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} — {m.matricule}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Type de cotisation</Label>
              <Select value={payForm.cotisationTypeId} onValueChange={selectCotisation}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {types.filter((t) => t.isActive).map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({formatCurrency(t.defaultAmount)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Montant dû (FCFA)</Label>
              <Input type="number" min={0} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Montant payé (FCFA)</Label>
              <Input type="number" min={0} value={payForm.amountPaid} onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mode de paiement</Label>
              <Select value={payForm.paymentMode} onValueChange={(v) => setPayForm({ ...payForm, paymentMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date</Label>
              <Input type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Note</Label>
              <Textarea rows={2} value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
            </div>
            {Number(payForm.amountPaid) > 0 && Number(payForm.amountPaid) < Number(payForm.amount) && (
              <p className="sm:col-span-2 text-xs text-amber-600 dark:text-amber-400">Le paiement sera enregistré comme <strong>partiel</strong> (reçu non émis).</p>
            )}
            {Number(payForm.amount) > 0 && Number(payForm.amountPaid) >= Number(payForm.amount) && (
              <p className="sm:col-span-2 text-xs text-emerald-600 dark:text-emerald-400">Un reçu sera automatiquement émis.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayFormOpen(false)}>Annuler</Button>
            <Button onClick={savePayment} disabled={paySaving}>{paySaving ? "Enregistrement…" : "Enregistrer"}</Button>
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
                  <Wallet className="h-5 w-5 text-primary" />
                  Détail du paiement
                </SheetTitle>
                <SheetDescription className="font-mono">{detail.reference}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <Badge variant="outline" className={STATUS_COLORS[detail.status]}>{PAYMENT_STATUS_LABELS[detail.status] || detail.status}</Badge>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Membre" value={`${detail.member?.firstName} ${detail.member?.lastName}`} />
                  <Field label="Matricule" value={detail.member?.matricule || "—"} mono />
                  <Field label="Cotisation" value={detail.cotisationType?.name || "—"} />
                  <Field label="Mode" value={PAYMENT_MODE_LABELS[detail.paymentMode] || detail.paymentMode} />
                  <Field label="Montant dû" value={formatCurrency(detail.amount)} />
                  <Field label="Montant payé" value={formatCurrency(detail.amountPaid)} />
                  <Field label="Date" value={formatDate(detail.paymentDate)} />
                  <Field label="Enregistré le" value={formatDateTime(detail.createdAt)} />
                </div>

                {detail.note && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Note</p>
                    <p className="mt-1">{detail.note}</p>
                  </div>
                )}

                {detail.receipt && (
                  <div className="rounded-lg border p-3 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">Reçu associé</p>
                    </div>
                    <p className="font-mono text-sm">{detail.receipt.number}</p>
                    {detail.receipt.cancelledAt && <p className="text-xs text-rose-600 mt-1">Reçu annulé</p>}
                    <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => { setDetailOpen(false); setModule("receipts") }}>Voir dans Reçus</Button>
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

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  )
}
