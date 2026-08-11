"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { CreditCard, UserX, CheckCircle2, XCircle, Search, Filter, Plus, Printer, RefreshCw } from "lucide-react"
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { formatDate } from "@/lib/sgiau/format"
import { QrBlock } from "@/components/sgiau/qr-block"
import { APP_FULL_NAME, UCAB_FULL_NAME, UCAB_MOTTO } from "@/lib/sgiau/constants"
import { initials } from "@/lib/sgiau/format"

interface CardMember {
  id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; level: string | null
  birthDate: string | null; email: string | null; phone: string | null; qrCode: string | null; sex: string
}
interface Card {
  id: string; cardNumber: string; memberId: string; issueDate: string; expiryDate: string | null
  qrCode: string | null; status: string; createdAt: string; member: CardMember
}
interface MiniMember { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null }

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", EXPIRED: "Expirée", REPLACED: "Remplacée" }
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  EXPIRED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  REPLACED: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
}

export default function CardsModule() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")
  const [membersWithoutCard, setMembersWithoutCard] = useState<MiniMember[]>([])
  const [totalMembers, setTotalMembers] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string>("")
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<Card | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [replacing, setReplacing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    const [cardsRes, membersRes] = await Promise.all([
      fetch(`/api/cards?${params}`),
      fetch("/api/members?limit=500"),
    ])
    const cardsData: Card[] = await cardsRes.json()
    const membersData: (MiniMember & { status: string })[] = await membersRes.json()
    setCards(cardsData)
    setTotalMembers(membersData.length)
    const withCardIds = new Set(cardsData.map((c) => c.memberId))
    // Use only ACTIVE members without a card
    setMembersWithoutCard(
      membersData
        .filter((m) => m.status === "ACTIVE" && !withCardIds.has(m.id))
        .map((m) => ({ id: m.id, matricule: m.matricule, firstName: m.firstName, lastName: m.lastName, faculty: m.faculty }))
    )
    setLoading(false)
  }, [q, status])

  useEffect(() => { load() }, [load])

  const stats = {
    active: cards.filter((c) => c.status === "ACTIVE").length,
    expired: cards.filter((c) => c.status === "EXPIRED" || (c.expiryDate && new Date(c.expiryDate) < new Date())).length,
    withoutCard: membersWithoutCard.length,
  }

  function openCreate() {
    setSelectedMember("")
    setFormOpen(true)
  }

  async function save() {
    if (!selectedMember) {
      toast.error("Veuillez sélectionner un membre")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMember }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(`Carte ${data.cardNumber} générée`)
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(c: Card) {
    setDetail(c)
    setDetailOpen(true)
  }

  async function replaceCard() {
    if (!detail) return
    if (!confirm(`Remplacer la carte ${detail.cardNumber} ? Une nouvelle carte sera générée.`)) return
    setReplacing(true)
    try {
      const res = await fetch(`/api/cards/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replace" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(`Nouvelle carte ${data.cardNumber} générée`)
      setDetailOpen(false)
      setDetail(null)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setReplacing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartes membres"
        description="Génération, impression et suivi des cartes d'adhérents"
        icon={CreditCard}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-2" disabled={membersWithoutCard.length === 0}>
            <Plus className="h-4 w-4" /> Générer une carte
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Cartes actives" value={stats.active} icon={CheckCircle2} tone="success" />
        <StatCard title="Cartes expirées / remplacées" value={stats.expired} icon={XCircle} tone="warning" />
        <StatCard title="Membres sans carte" value={`${stats.withoutCard} / ${totalMembers}`} icon={UserX} tone="info" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Numéro de carte, nom, matricule…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-48"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={8} />
        ) : cards.length === 0 ? (
          <EmptyState icon={CreditCard} title="Aucune carte émise" description="Générez la première carte membre." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Générer une carte</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>N° carte</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead className="hidden md:table-cell">Matricule</TableHead>
                  <TableHead className="hidden lg:table-cell">Émise le</TableHead>
                  <TableHead className="hidden lg:table-cell">Expire le</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c)}>
                    <TableCell className="font-mono text-xs">{c.cardNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(c.member.firstName, c.member.lastName)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{c.member.firstName} {c.member.lastName}</p>
                          <p className="text-xs text-muted-foreground">{c.member.faculty ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs">{c.member.matricule}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{formatDate(c.issueDate)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{formatDate(c.expiryDate)}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[c.status] ?? STATUS_COLORS.ACTIVE}>{STATUS_LABELS[c.status] ?? c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Form: select member without card */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Générer une carte membre</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Membre sans carte *</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un membre…" /></SelectTrigger>
                <SelectContent>
                  {membersWithoutCard.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.matricule}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{membersWithoutCard.length} membre(s) éligible(s). Le numéro de carte sera généré automatiquement (format C{new Date().getFullYear()}XXXX) avec la date de fin d'exercice fiscal comme expiration.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !selectedMember}>{saving ? "Génération…" : "Générer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail: printable card */}
      <Dialog open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetail(null) }}>
        <DialogContent className="sm:max-w-lg print:sm:max-w-none print:p-0">
          <DialogHeader className="print:hidden">
            <DialogTitle>Carte membre — {detail?.cardNumber}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">              {/* Card visual — modèle portrait : bandeau rouge ondulé, photo, nom, QR/signature, grille 2×3 */}
              <div className="print-area mx-auto" style={{ width: "320px" }}>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl print:shadow-none">
                  {/* Bandeau rouge ondulé */}
                  <div className="relative bg-gradient-to-b from-[#c21212] to-[#8a0a0a] px-4 pt-4 text-center text-white">
                    <p className="text-[8px] uppercase tracking-[0.26em] text-white/85">{UCAB_FULL_NAME}</p>
                    <div className="mt-1.5 flex items-center justify-center gap-2">
                      <img src="/logo-aeucab.png" alt="Logo de l'amicale" className="h-8 w-8 rounded-full bg-white object-cover" />
                      <p className="text-xl font-black tracking-wide leading-none">AEUCAB-ZAI</p>
                    </div>
                    <p className="mt-1 text-[8px] italic text-white/75">« {UCAB_MOTTO} »</p>
                    <svg className="relative mt-3 w-full text-white" viewBox="0 0 320 14" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M0 9 C28 2 60 14 92 8 C124 2 158 14 190 8 C222 2 254 14 286 8 C300 5 312 9 320 6 L320 14 L0 14 Z" fill="currentColor" />
                    </svg>
                  </div>

                  {/* Corps : photo + identité + QR/signature */}
                  <div className="flex items-start gap-3 p-4">
                    <div className="shrink-0 rounded-lg border-2 border-[#b80808]/40 p-0.5">
                      <Avatar className="h-20 w-20 rounded-md">
                        <AvatarFallback className="bg-red-50 text-lg font-bold text-[#b80808]">
                          {initials(detail.member.firstName, detail.member.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="truncate text-[15px] font-bold leading-tight">{detail.member.firstName} {detail.member.lastName}</p>
                      <p className="truncate text-[11px] font-semibold text-[#b80808]">
                        {detail.member.faculty ?? "—"}{detail.member.level ? ` · ${detail.member.level}` : ""}
                      </p>
                      <p className="mt-1 font-mono text-[9px] text-gray-500">N° {detail.cardNumber}</p>
                    </div>
                    <div className="shrink-0 text-center">
                      <QrBlock value={detail.qrCode ?? detail.cardNumber} size={64} />
                      <p className="mt-0.5 font-serif text-[9px] italic text-gray-400">Signature</p>
                    </div>
                  </div>

                  {/* Grille de données 2×3 */}
                  <div className="grid grid-cols-3 divide-x divide-dotted divide-gray-300 border-t-2 border-[#b80808] bg-gray-50/70 text-center">
                    {[
                      { label: "Matricule", value: detail.member.matricule },
                      { label: "Adhésion", value: formatDate(detail.issueDate) },
                      { label: "Email", value: detail.member.email ?? "—" },
                      { label: "Naissance", value: formatDate(detail.member.birthDate) },
                      { label: "Expire", value: formatDate(detail.expiryDate) },
                      { label: "Téléphone", value: detail.member.phone ?? "—" },
                    ].map((f) => (
                      <div key={f.label} className="px-1 py-2">
                        <p className="text-[7px] uppercase tracking-wider text-gray-400">{f.label}</p>
                        <p className="mt-0.5 truncate text-[9px] font-semibold text-gray-700">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-center text-[9px] text-muted-foreground print:hidden">« {UCAB_MOTTO} » · {APP_FULL_NAME}</p>
              </div>

              <div className="print:hidden flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Imprimer
                </Button>
                <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={replaceCard} disabled={replacing || detail.status === "REPLACED"}>
                  <RefreshCw className="h-4 w-4" /> Remplacer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
