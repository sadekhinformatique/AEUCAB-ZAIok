"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { ReceiptText, Plus, Search, Filter, Printer, Ban, FileText, CheckCircle2, XCircle } from "lucide-react"
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
import { toast } from "sonner"
import { PAYMENT_MODE_LABELS, UCAB_FULL_NAME } from "@/lib/sgiau/constants"
import { formatCurrency, formatDate, formatDateTime, toCSV, downloadCSV } from "@/lib/sgiau/format"
import { QrBlock } from "@/components/sgiau/qr-block"

interface Receipt {
  id: string; number: string; amount: number; cashierId: string | null; cashierSign: string | null
  treasurerSign: string | null; qrCode: string | null; pdfUrl: string | null
  cancelledAt: string | null; cancelReason: string | null; createdAt: string; paymentId: string; memberId: string
  member: { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; level: string | null; department: string | null; academicYear: string | null; phone: string | null; email: string | null }
  payment: { id: string; reference: string; paymentMode: string; amount: number; amountPaid: number; paymentDate: string; note: string | null; cotisationType: { name: string; kind: string } | null } | null
  cashier: { id: string; fullName: string; role: string } | null
}

interface Member { id: string; matricule: string; firstName: string; lastName: string }
interface PaymentLite { id: string; reference: string; amount: number; amountPaid: number; status: string; cotisationType: { name: string } | null; receipt: { id: string } | null }

// --- Amount in words (French) — simple version covering thousands ---
const UNITIES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"]

function below100(n: number): string {
  if (n < 20) return UNITIES[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 7 || t === 9) {
    const base = TENS[t]
    const rest = below100(10 + u)
    return `${base}-${rest}`
  }
  let str = TENS[t]
  if (u === 1 && t !== 8) str += "-et-un"
  else if (u > 0) str += `-${UNITIES[u]}`
  else if (t === 8) str += "s"
  return str
}

function below1000(n: number): string {
  if (n < 100) return below100(n)
  const h = Math.floor(n / 100)
  const r = n % 100
  let str = h === 1 ? "cent" : `${UNITIES[h]} cent`
  if (h > 1 && r === 0) str += "s"
  if (r > 0) str += ` ${below100(r)}`
  return str
}

export function amountInWords(amount: number): string {
  const a = Math.floor(Math.abs(amount))
  if (a === 0) return "zéro franc CFA"
  const millions = Math.floor(a / 1_000_000)
  const thousands = Math.floor((a % 1_000_000) / 1000)
  const rest = a % 1000
  const parts: string[] = []
  if (millions > 0) parts.push(millions === 1 ? "un million" : `${below1000(millions)} millions`)
  if (thousands > 0) parts.push(thousands === 1 ? "mille" : `${below1000(thousands)} mille`)
  if (rest > 0) parts.push(below1000(rest))
  let s = parts.join(" ")
  s += " franc"
  if (a > 1) s += "s"
  s += " CFA"
  return s
}

export default function ReceiptsModule() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberPayments, setMemberPayments] = useState<PaymentLite[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL") // ALL | VALID | CANCELLED

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ memberId: "", paymentId: "", newAmount: "0", mode: "CASH" })
  const [creating, setCreating] = useState(false)

  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

  const [cancelTarget, setCancelTarget] = useState<Receipt | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [recRes, memRes] = await Promise.all([
        fetch("/api/receipts?limit=500"),
        fetch("/api/members?limit=500"),
      ])
      const recData = await recRes.json()
      const memData = await memRes.json()
      setReceipts(recData || [])
      setMembers(memData || [])
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Load member payments when member selected in create form
  useEffect(() => {
    if (!createForm.memberId) { setMemberPayments([]); return }
    fetch(`/api/members/${createForm.memberId}`)
      .then((r) => r.json())
      .then((d) => setMemberPayments((d.payments || []).filter((p: PaymentLite) => p.status === "PAID" && !p.receipt)))
      .catch(() => setMemberPayments([]))
  }, [createForm.memberId])

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (statusFilter === "VALID" && r.cancelledAt) return false
      if (statusFilter === "CANCELLED" && !r.cancelledAt) return false
      if (q) {
        const s = q.toLowerCase()
        const full = `${r.number} ${r.member?.firstName} ${r.member?.lastName} ${r.member?.matricule}`.toLowerCase()
        if (!full.includes(s)) return false
      }
      return true
    })
  }, [receipts, q, statusFilter])

  const stats = useMemo(() => ({
    total: receipts.length,
    montantEmis: receipts.filter((r) => !r.cancelledAt).reduce((s, r) => s + r.amount, 0),
    annules: receipts.filter((r) => r.cancelledAt).length,
  }), [receipts])

  async function createReceipt() {
    if (!createForm.memberId) { toast.error("Sélectionnez un membre"); return }
    if (!createForm.paymentId && (!createForm.newAmount || Number(createForm.newAmount) <= 0)) {
      toast.error("Sélectionnez un paiement ou saisissez un montant"); return
    }
    setCreating(true)
    try {
      const payload: Record<string, unknown> = { memberId: createForm.memberId, paymentMode: createForm.mode }
      if (createForm.paymentId) payload.paymentId = createForm.paymentId
      else payload.amount = Number(createForm.newAmount)
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(`Reçu ${data.number} émis`)
      setCreateOpen(false)
      setCreateForm({ memberId: "", paymentId: "", newAmount: "0", mode: "CASH" })
      load()
      // Open the freshly created receipt in view mode
      setViewReceipt(data)
      setViewOpen(true)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function cancelReceipt() {
    if (!cancelTarget) return
    if (!cancelReason.trim()) { toast.error("Le motif d'annulation est requis"); return }
    setCancelling(true)
    try {
      const res = await fetch(`/api/receipts/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: cancelReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Reçu annulé")
      setCancelTarget(null)
      setCancelReason("")
      load()
      if (viewReceipt?.id === cancelTarget.id) setViewReceipt(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCancelling(false)
    }
  }

  function exportCSV() {
    const rows = filtered.map((r) => ({
      numero: r.number,
      date: formatDate(r.createdAt),
      membre: `${r.member?.firstName} ${r.member?.lastName}`,
      matricule: r.member?.matricule,
      montant: r.amount,
      mode: r.payment ? (PAYMENT_MODE_LABELS[r.payment.paymentMode] || r.payment.paymentMode) : "—",
      caissier: r.cashier?.fullName ?? "—",
      statut: r.cancelledAt ? "ANNULÉ" : "VALIDE",
      motif: r.cancelReason ?? "",
    }))
    downloadCSV(`recus-${Date.now()}.csv`, toCSV(rows))
    toast.success(`${rows.length} reçus exportés`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reçus"
        description="Émission, impression et suivi des reçus de paiement"
        icon={ReceiptText}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Printer className="h-4 w-4" /> Exporter
            </Button>
            <Button size="sm" onClick={() => { setCreateForm({ memberId: "", paymentId: "", newAmount: "0", mode: "CASH" }); setCreateOpen(true) }} className="gap-2">
              <Plus className="h-4 w-4" /> Générer un reçu
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total reçus" value={stats.total} icon={ReceiptText} />
        <StatCard title="Montant émis" value={<Money value={stats.montantEmis} />} icon={CheckCircle2} tone="success" />
        <StatCard title="Reçus annulés" value={stats.annules} icon={XCircle} tone={stats.annules > 0 ? "danger" : "default"} />
        <StatCard title="Reçus valides" value={stats.total - stats.annules} icon={FileText} tone="info" />
      </div>

      <SectionCard title="Liste des reçus" description={`${filtered.length} reçu(s)`}>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Numéro, membre, matricule…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="VALID">Valides</SelectItem>
              <SelectItem value="CANCELLED">Annulés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? <LoadingState rows={8} /> : filtered.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Aucun reçu" description="Générez un premier reçu." action={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Générer un reçu</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="hidden md:table-cell">Caissier</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => { setViewReceipt(r); setViewOpen(true) }}>
                    <TableCell className="font-mono text-xs">{r.number}</TableCell>
                    <TableCell>
                      <p className="font-medium">{r.member?.firstName} {r.member?.lastName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.member?.matricule}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums"><Money value={r.amount} /></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{r.cashier?.fullName ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      {r.cancelledAt ? (
                        <Badge variant="outline" className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">Annulé</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Valide</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Create receipt dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Générer un reçu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Membre *</Label>
              <Select value={createForm.memberId} onValueChange={(v) => setCreateForm({ ...createForm, memberId: v, paymentId: "" })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} — {m.matricule}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {createForm.memberId && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Paiement sans reçu</Label>
                  {memberPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground rounded-md border p-3 bg-muted/30">
                      Aucun paiement éligible. Créez un nouveau paiement ci-dessous.
                    </p>
                  ) : (
                    <Select value={createForm.paymentId} onValueChange={(v) => setCreateForm({ ...createForm, paymentId: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un paiement" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {memberPayments.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.reference} — {p.cotisationType?.name ?? "Paiement"} — {formatCurrency(p.amountPaid)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {!createForm.paymentId && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Nouveau paiement — montant (FCFA)</Label>
                      <Input type="number" min={0} value={createForm.newAmount} onChange={(e) => setCreateForm({ ...createForm, newAmount: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Mode de paiement</Label>
                      <Select value={createForm.mode} onValueChange={(v) => setCreateForm({ ...createForm, mode: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={createReceipt} disabled={creating}>{creating ? "Émission…" : "Émettre le reçu"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt view dialog (printable) */}
      <Dialog open={viewOpen} onOpenChange={(o) => { setViewOpen(o); if (!o) setViewReceipt(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto scroll-thin">
          {viewReceipt && (
            <div className="print-receipt">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-primary pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <img src="/logo-aeucab.png" alt="Logo de l'amicale" className="h-14 w-14 rounded-full border-2 border-primary/30 bg-white object-cover" />
                  <div>
                    <p className="font-bold text-lg leading-tight">{UCAB_FULL_NAME}</p>
                    <p className="text-xs text-muted-foreground">Exercice {viewReceipt.payment?.paymentDate ? new Date(viewReceipt.payment.paymentDate).getFullYear() : new Date().getFullYear()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Reçu de caisse</p>
                  <p className="font-mono font-bold text-primary">{viewReceipt.number}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(viewReceipt.createdAt)}</p>
                </div>
              </div>

              {viewReceipt.cancelledAt && (
                <div className="mb-4 rounded-md border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 text-rose-700 dark:text-rose-300 text-sm">
                  <p className="font-semibold">REÇU ANNULÉ — {formatDateTime(viewReceipt.cancelledAt)}</p>
                  {viewReceipt.cancelReason && <p className="text-xs mt-1">Motif : {viewReceipt.cancelReason}</p>}
                </div>
              )}

              {/* Member info */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Reçu de</p>
                  <p className="font-semibold">{viewReceipt.member?.firstName} {viewReceipt.member?.lastName}</p>
                  <p className="text-xs font-mono text-muted-foreground">Matricule : {viewReceipt.member?.matricule}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Filière / Niveau</p>
                  <p className="font-medium">{viewReceipt.member?.faculty ?? "—"} · {viewReceipt.member?.level ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{viewReceipt.member?.department ?? "—"}</p>
                </div>
              </div>

              {/* Amount */}
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Montant</p>
                  <p className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(viewReceipt.amount)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Arrêté la présente somme à :</p>
                <p className="font-medium italic capitalize">{amountInWords(viewReceipt.amount)}.</p>
              </div>

              {/* Payment details */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Objet</p>
                  <p className="font-medium">{viewReceipt.payment?.cotisationType?.name ?? "Paiement"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mode de paiement</p>
                  <p className="font-medium">{viewReceipt.payment ? (PAYMENT_MODE_LABELS[viewReceipt.payment.paymentMode] || viewReceipt.payment.paymentMode) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Référence paiement</p>
                  <p className="font-mono text-xs">{viewReceipt.payment?.reference ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Caissier</p>
                  <p className="font-medium">{viewReceipt.cashier?.fullName ?? "—"}</p>
                </div>
              </div>

              {/* QR + signatures */}
              <div className="flex items-start justify-between gap-4 mt-6">
                <div className="text-center">
                  <QrBlock value={viewReceipt.qrCode || viewReceipt.number} size={96} />
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{viewReceipt.qrCode || viewReceipt.number}</p>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4 text-center text-xs">
                  <div>
                    <div className="border-t border-dashed border-muted-foreground/40 mt-10 pt-1">Le Caissier</div>
                    <p className="text-muted-foreground mt-1">{viewReceipt.cashier?.fullName ?? "—"}</p>
                  </div>
                  <div>
                    <div className="border-t border-dashed border-muted-foreground/40 mt-10 pt-1">Le Trésorier</div>
                    <p className="text-muted-foreground mt-1">Signature & cachet</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center mt-6">
                Ce reçu est généré électroniquement par SGIAU. Présentez-le pour toute vérification.
              </p>

              {/* Actions (hidden on print) */}
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t print:hidden">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Imprimer
                </Button>
                {!viewReceipt.cancelledAt && (
                  <Button variant="outline" size="sm" className="gap-2 text-rose-600 hover:text-rose-700" onClick={() => { setCancelTarget(viewReceipt); setCancelReason("") }}>
                    <Ban className="h-4 w-4" /> Annuler avec motif
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setViewOpen(false)}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) { setCancelTarget(null); setCancelReason("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Annuler le reçu {cancelTarget?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">L'annulation est définitive. Le reçu restera enregistré mais marqué comme annulé.</p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Motif d'annulation *</Label>
              <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex : doublon, erreur de saisie…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason("") }}>Fermer</Button>
            <Button variant="destructive" onClick={cancelReceipt} disabled={cancelling}>{cancelling ? "Annulation…" : "Confirmer l'annulation"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
