"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { CheckSquare, SquarePlus, Search, Trash2, Lock, CheckCircle2, QrCode, Printer, Vote as VoteIcon, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { UCAB_FULL_NAME } from "@/lib/sgiau/constants"
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
import { formatDate, formatDateTime } from "@/lib/sgiau/format"
import { QrBlock } from "@/components/sgiau/qr-block"

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouvert",
  CLOSED: "Clôturé",
}
const STATUS_TONES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CLOSED: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
}

interface VoteOption {
  id: string
  label: string
  voteCount: number
}
interface VoteItem {
  id: string
  title: string
  question: string
  anonymous: boolean
  startDate: string
  endDate: string
  status: string
  qrCode: string | null
  createdAt: string
  options: VoteOption[]
  optionCounts?: Record<string, number>
  _count?: { ballots: number }
}
interface VoteDetail extends VoteItem {
  ballots: any[]
  totalBallots: number
}
interface Member { id: string; matricule: string; firstName: string; lastName: string }

const emptyForm = {
  title: "", question: "", anonymous: true,
  startDate: "", endDate: "", options: "Oui, Non, Abstention",
}

export default function VotesModule() {
  const [items, setItems] = useState<VoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")
  const [stats, setStats] = useState({ open: 0, ballots: 0, participation: 0 })

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<VoteDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [voterMember, setVoterMember] = useState("")
  const [selectedOption, setSelectedOption] = useState("")
  const [voting, setVoting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    const res = await fetch(`/api/votes?${params}`)
    const data = await res.json()
    setItems(data)
    const totalBallots = data.reduce((s: number, v: VoteItem) => s + (v._count?.ballots ?? 0), 0)
    setStats({
      open: data.filter((v: VoteItem) => v.status === "OPEN").length,
      ballots: totalBallots,
      participation: data.length > 0 ? Math.round(totalBallots / data.length) : 0,
    })
    setLoading(false)
  }, [q, status])

  useEffect(() => { load() }, [load])

  async function loadMembers() {
    if (members.length) return
    const res = await fetch("/api/members?limit=500")
    const data = await res.json()
    setMembers(data)
  }

  function openCreate() { setForm(emptyForm); setFormOpen(true) }

  async function save() {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return }
    if (!form.question.trim()) { toast.error("La question est requise"); return }
    if (!form.startDate || !form.endDate) { toast.error("Les dates sont requises"); return }
    const opts = form.options.split(",").map((s) => s.trim()).filter(Boolean)
    if (opts.length < 2) { toast.error("Au moins 2 options sont requises"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, options: opts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Vote créé")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(v: VoteItem) {
    if (!confirm(`Supprimer le vote "${v.title}" ?`)) return
    const res = await fetch(`/api/votes/${v.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Vote supprimé"); load() }
    else toast.error("Échec")
  }

  async function openDetail(v: VoteItem) {
    setDetailOpen(true); setDetailLoading(true)
    const res = await fetch(`/api/votes/${v.id}`)
    const data = await res.json()
    setDetail(data)
    setSelectedOption(data.options[0]?.id ?? "")
    setDetailLoading(false)
    loadMembers()
  }

  async function reloadDetail() {
    if (!detail) return
    const res = await fetch(`/api/votes/${detail.id}`)
    const data = await res.json()
    setDetail(data)
  }

  async function castBallot() {
    if (!detail) return
    if (!selectedOption) { toast.error("Choisissez une option"); return }
    if (!voterMember) { toast.error("Sélectionnez un votant (membre)"); return }
    setVoting(true)
    try {
      const res = await fetch(`/api/votes/${detail.id}/ballots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: selectedOption, memberId: voterMember }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Bulletin déposé")
      setVoterMember("")
      reloadDetail()
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setVoting(false)
    }
  }

  async function closeVote() {
    if (!detail) return
    if (!confirm(`Clôturer le vote "${detail.title}" ?`)) return
    const res = await fetch(`/api/votes/${detail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    })
    if (res.ok) { toast.success("Vote clôturé"); reloadDetail(); load() }
    else toast.error("Échec")
  }

  function printReport() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Votes internes"
        description="Consultations anonymes ou nominatives, résultats en temps réel"
        icon={CheckSquare}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-2">
            <SquarePlus className="h-4 w-4" /> Nouveau vote
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Votes ouverts" value={stats.open} icon={CheckSquare} tone="success" />
        <StatCard title="Total bulletins" value={stats.ballots} icon={BarChart3} tone="info" />
        <StatCard title="Participation moyenne" value={stats.participation} icon={VoteIcon} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Titre, question…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={5} />
        ) : items.length === 0 ? (
          <EmptyState icon={CheckSquare} title="Aucun vote" description="Créez votre premier vote interne." action={<Button onClick={openCreate} className="gap-2"><SquarePlus className="h-4 w-4" /> Nouveau vote</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Vote</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Options</TableHead>
                  <TableHead className="text-center">Bulletins</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((v) => (
                  <TableRow key={v.id} className="cursor-pointer" onClick={() => openDetail(v)}>
                    <TableCell>
                      <p className="font-medium">{v.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{v.question}</p>
                      {v.anonymous && <Badge variant="outline" className="mt-1 text-[10px]">Anonyme</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <p>{formatDate(v.startDate)}</p>
                      <p className="text-xs text-muted-foreground">→ {formatDate(v.endDate)}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_TONES[v.status]}>{STATUS_LABELS[v.status] ?? v.status}</Badge></TableCell>
                    <TableCell className="text-center">{v.options.length}</TableCell>
                    <TableCell className="text-center">{v._count?.ballots ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(v)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>Nouveau vote</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Field label="Titre *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Question *"><Textarea rows={2} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
            </div>
            <Field label="Date de début *"><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Date de fin *"><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Options (séparées par des virgules)"><Input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} /></Field>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <Switch checked={form.anonymous} onCheckedChange={(v) => setForm({ ...form, anonymous: v })} id="anon" />
              <Label htmlFor="anon" className="text-sm">Vote anonyme</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Création…" : "Créer le vote"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetail(null) }}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto scroll-thin">
          {detailLoading || !detail ? (
            <div className="p-6"><LoadingState rows={4} /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 text-primary p-2"><CheckSquare className="h-5 w-5" /></div>
                  <div>
                    <p>{detail.title}</p>
                    <SheetDescription>{formatDate(detail.startDate)} → {formatDate(detail.endDate)}</SheetDescription>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={STATUS_TONES[detail.status]}>{STATUS_LABELS[detail.status] ?? detail.status}</Badge>
                  {detail.anonymous && <Badge variant="outline">Anonyme</Badge>}
                  <Badge variant="outline">{detail.totalBallots} bulletins</Badge>
                </div>

                <SectionCard title="Question">
                  <p className="text-sm font-medium">{detail.question}</p>
                </SectionCard>

                {/* Results */}
                <SectionCard title="Résultats en direct">
                  {detail.options.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune option.</p>
                  ) : (
                    <div className="space-y-3">
                      {detail.options.map((opt) => {
                        const pct = detail.totalBallots > 0 ? Math.round((opt.voteCount / detail.totalBallots) * 100) : 0
                        return (
                          <div key={opt.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-muted-foreground">{opt.voteCount} · {pct}%</span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </SectionCard>

                {/* QR code for the vote */}
                <SectionCard title="QR Code du vote">
                  <div className="flex items-center gap-4">
                    <QrBlock value={detail.qrCode || detail.id} size={120} />
                    <div className="text-sm">
                      <p className="font-mono text-xs text-muted-foreground">{detail.qrCode ?? detail.id}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Affichez ce QR pour permettre aux membres de voter depuis leur smartphone.</p>
                    </div>
                  </div>
                </SectionCard>

                {/* Cast a ballot (demo) */}
                {detail.status === "OPEN" && (
                  <SectionCard title="Déposer un bulletin">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium">Votant (membre)</Label>
                        <Select value={voterMember} onValueChange={setVoterMember}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un membre…" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.matricule}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Choix</Label>
                        <Select value={selectedOption} onValueChange={setSelectedOption}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {detail.options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full gap-2" onClick={castBallot} disabled={voting || !voterMember || !selectedOption}>
                        <VoteIcon className="h-4 w-4" /> {voting ? "Dépôt…" : "Déposer le bulletin"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">Un seul bulletin par membre est autorisé.</p>
                    </div>
                  </SectionCard>
                )}

                {/* Recent ballots */}
                {detail.ballots.length > 0 && (
                  <SectionCard title={`Derniers bulletins (${detail.ballots.length})`}>
                    <div className="space-y-1 max-h-48 overflow-y-auto scroll-thin">
                      {detail.ballots.slice(0, 10).map((b: any) => (
                        <div key={b.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span>
                            {detail.anonymous
                              ? <span className="text-muted-foreground">Bulletins anonyme</span>
                              : <span>{b.member?.firstName ?? "—"} {b.member?.lastName ?? ""}</span>}
                          </span>
                          <span className="text-xs text-muted-foreground">{b.option?.label ?? "—"} · {formatDateTime(b.votedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={printReport}>
                    <Printer className="h-4 w-4" /> Imprimer les résultats
                  </Button>
                  {detail.status === "OPEN" && (
                    <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={closeVote}>
                      <Lock className="h-4 w-4" /> Clôturer
                    </Button>
                  )}
                  {detail.status === "CLOSED" && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Vote clôturé
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Printable report (hidden on screen) */}
      {detail && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-50">
          <div className="flex items-center gap-3 border-b-2 border-[#086808] pb-4 mb-6">
            <img src="/logo-aeucab.png" alt="Logo de l'amicale" className="h-14 w-14 rounded-full border-2 border-[#086808]/30 bg-white object-cover" />
            <div>
              <p className="font-bold text-lg leading-tight">{UCAB_FULL_NAME}</p>
              <p className="text-xs text-gray-500">Rapport de vote</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{detail.title}</h1>
          <p className="text-sm text-gray-600 mb-4">{detail.question}</p>
          <p className="text-xs text-gray-500 mb-6">Période : {formatDate(detail.startDate)} → {formatDate(detail.endDate)}</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2">Option</th>
                <th className="text-right py-2">Voix</th>
                <th className="text-right py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {detail.options.map((o) => {
                const pct = detail.totalBallots > 0 ? ((o.voteCount / detail.totalBallots) * 100).toFixed(1) : "0"
                return (
                  <tr key={o.id} className="border-b border-gray-200">
                    <td className="py-2">{o.label}</td>
                    <td className="text-right py-2">{o.voteCount}</td>
                    <td className="text-right py-2">{pct}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-400 font-bold">
                <td className="py-2">Total</td>
                <td className="text-right py-2">{detail.totalBallots}</td>
                <td className="text-right py-2">100%</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs text-gray-500 mt-6">Document généré le {formatDateTime(new Date().toISOString())} — SGIAU</p>
        </div>
      )}
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
