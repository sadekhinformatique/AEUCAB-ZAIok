"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { Landmark, Plus, ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, Filter, Download, CheckCircle2 } from "lucide-react"
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
import { formatCurrency, formatDate, toCSV, downloadCSV } from "@/lib/sgiau/format"

interface CashAccount {
  id: string; name: string; balance: number; currency: string; isActive: boolean
  account: { id: string; code: string; name: string }
}
interface CashMovement {
  id: string; type: string; amount: number; label: string; date: string; validated: boolean
  refType: string | null; refId: string | null
  cashAccount: { id: string; name: string; currency: string }
}

const emptyMvForm = { cashAccountId: "", type: "IN", amount: "0", label: "" }
const emptyTransferForm = { fromAccountId: "", toAccountId: "", amount: "0", note: "" }

export default function CashModule() {
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [accFilter, setAccFilter] = useState("ALL")

  const [mvOpen, setMvOpen] = useState(false)
  const [mvForm, setMvForm] = useState(emptyMvForm)
  const [mvSaving, setMvSaving] = useState(false)

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferForm, setTransferForm] = useState(emptyTransferForm)
  const [transferSaving, setTransferSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/cash?limit=300")
      const data = await res.json()
      setAccounts(data.accounts || [])
      setMovements(data.movements || [])
      setTotalBalance(data.totalBalance ?? 0)
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filteredMovements = useMemo(() => {
    if (accFilter === "ALL") return movements
    return movements.filter((m) => m.cashAccount.id === accFilter)
  }, [movements, accFilter])

  const stats = useMemo(() => {
    const inSum = movements.filter((m) => m.type === "IN").reduce((s, m) => s + m.amount, 0)
    const outSum = movements.filter((m) => m.type === "OUT").reduce((s, m) => s + m.amount, 0)
    return { in: inSum, out: outSum, count: movements.length }
  }, [movements])

  function openCreateMv() {
    setMvForm({ ...emptyMvForm, cashAccountId: accounts[0]?.id || "" })
    setMvOpen(true)
  }

  async function saveMv() {
    if (!mvForm.cashAccountId) { toast.error("Sélectionnez un compte"); return }
    if (!mvForm.amount || Number(mvForm.amount) <= 0) { toast.error("Montant invalide"); return }
    if (!mvForm.label.trim()) { toast.error("Le libellé est requis"); return }
    setMvSaving(true)
    try {
      const res = await fetch("/api/cash/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashAccountId: mvForm.cashAccountId,
          type: mvForm.type,
          amount: Number(mvForm.amount),
          label: mvForm.label.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Mouvement enregistré")
      setMvOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setMvSaving(false)
    }
  }

  function openTransfer() {
    setTransferForm({ ...emptyTransferForm, fromAccountId: accounts[0]?.id || "", toAccountId: accounts[1]?.id || accounts[0]?.id || "" })
    setTransferOpen(true)
  }

  async function saveTransfer() {
    if (!transferForm.fromAccountId || !transferForm.toAccountId) { toast.error("Sélectionnez les comptes"); return }
    if (transferForm.fromAccountId === transferForm.toAccountId) { toast.error("Les comptes doivent être différents"); return }
    if (!transferForm.amount || Number(transferForm.amount) <= 0) { toast.error("Montant invalide"); return }
    setTransferSaving(true)
    try {
      const res = await fetch("/api/cash/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: transferForm.fromAccountId,
          toAccountId: transferForm.toAccountId,
          amount: Number(transferForm.amount),
          note: transferForm.note.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Transfert effectué")
      setTransferOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTransferSaving(false)
    }
  }

  function exportCSV() {
    const rows = filteredMovements.map((m) => ({
      date: formatDate(m.date),
      compte: m.cashAccount.name,
      type: m.type === "IN" ? "Entrée" : "Sortie",
      libelle: m.label,
      montant: m.amount,
      valide: m.validated ? "Oui" : "Non",
      ref: m.refType ? `${m.refType}/${m.refId?.slice(-6)}` : "",
    }))
    downloadCSV(`caisse-${Date.now()}.csv`, toCSV(rows))
    toast.success(`${rows.length} mouvements exportés`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caisse"
        description="Comptes de caisse, mouvements et transferts"
        icon={Landmark}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button variant="outline" size="sm" onClick={openTransfer} className="gap-2">
              <ArrowLeftRight className="h-4 w-4" /> Transfert
            </Button>
            <Button size="sm" onClick={openCreateMv} className="gap-2">
              <Plus className="h-4 w-4" /> Nouveau mouvement
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Solde total" value={<Money value={totalBalance} />} icon={Landmark} tone="success" />
        <StatCard title="Entrées (cumul)" value={<Money value={stats.in} />} icon={ArrowDownCircle} tone="info" />
        <StatCard title="Sorties (cumul)" value={<Money value={stats.out} />} icon={ArrowUpCircle} tone="danger" />
        <StatCard title="Mouvements" value={stats.count} icon={Plus} />
      </div>

      {/* Cash accounts cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            <div className="h-28 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-28 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          </>
        ) : accounts.map((a) => (
          <div key={a.id} className="rounded-xl border p-5 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 text-primary p-2"><Landmark className="h-4 w-4" /></div>
                <div>
                  <p className="font-semibold text-sm">{a.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">Compte {a.account.code}</p>
                </div>
              </div>
              <Badge variant="outline" className={a.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-neutral-100 text-neutral-600"}>
                {a.isActive ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Solde courant</p>
              <p className="text-2xl font-bold tabular-nums"><Money value={a.balance} /></p>
            </div>
          </div>
        ))}
      </div>

      {/* Movements table */}
      <SectionCard title="Mouvements récents" description={`${filteredMovements.length} mouvement(s)`}>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Select value={accFilter} onValueChange={setAccFilter}>
            <SelectTrigger className="w-full sm:w-56"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Compte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les comptes</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? <LoadingState rows={10} /> : filteredMovements.length === 0 ? (
          <EmptyState icon={Landmark} title="Aucun mouvement" description="Enregistrez un premier mouvement." />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(m.date)}</TableCell>
                    <TableCell className="text-sm">{m.cashAccount.name}</TableCell>
                    <TableCell>
                      {m.type === "IN" ? (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 gap-1"><ArrowDownCircle className="h-3 w-3" /> Entrée</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 gap-1"><ArrowUpCircle className="h-3 w-3" /> Sortie</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.label}
                      {m.refType && <Badge variant="outline" className="ml-2 text-[10px] bg-muted/50">{m.refType}</Badge>}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${m.type === "IN" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                      {m.type === "IN" ? "+" : "−"} <Money value={m.amount} />
                    </TableCell>
                    <TableCell>
                      {m.validated ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 gap-1"><CheckCircle2 className="h-3 w-3" /> Validé</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200">En attente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* New movement dialog */}
      <Dialog open={mvOpen} onOpenChange={setMvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau mouvement de caisse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Compte *</Label>
              <Select value={mvForm.cashAccountId} onValueChange={(v) => setMvForm({ ...mvForm, cashAccountId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type de mouvement *</Label>
              <Select value={mvForm.type} onValueChange={(v) => setMvForm({ ...mvForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrée (IN)</SelectItem>
                  <SelectItem value="OUT">Sortie (OUT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Montant (FCFA) *</Label>
              <Input type="number" min={0} value={mvForm.amount} onChange={(e) => setMvForm({ ...mvForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Libellé *</Label>
              <Textarea rows={2} value={mvForm.label} onChange={(e) => setMvForm({ ...mvForm, label: e.target.value })} placeholder="Ex : Apport personnel, achat fournitures…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMvOpen(false)}>Annuler</Button>
            <Button onClick={saveMv} disabled={mvSaving}>{mvSaving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfert entre comptes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Compte source *</Label>
              <Select value={transferForm.fromAccountId} onValueChange={(v) => setTransferForm({ ...transferForm, fromAccountId: v })}>
                <SelectTrigger><SelectValue placeholder="Depuis…" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Compte destination *</Label>
              <Select value={transferForm.toAccountId} onValueChange={(v) => setTransferForm({ ...transferForm, toAccountId: v })}>
                <SelectTrigger><SelectValue placeholder="Vers…" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Montant (FCFA) *</Label>
              <Input type="number" min={0} value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Note</Label>
              <Textarea rows={2} value={transferForm.note} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} placeholder="Ex : Approvisionnement caisse principale…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Annuler</Button>
            <Button onClick={saveTransfer} disabled={transferSaving}>{transferSaving ? "Transfert…" : "Transférer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
