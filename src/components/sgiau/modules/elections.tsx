"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { Vote, SquarePlus, Search, Trash2, UserPlus, Lock, CheckCircle2, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { formatDate } from "@/lib/sgiau/format"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouverte",
  CLOSED: "Clôturée",
  ARCHIVED: "Archivée",
}
const STATUS_TONES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CLOSED: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  ARCHIVED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

interface Candidate {
  id: string
  memberId: string
  position: string
  program: string | null
  voteCount: number
  member: { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null }
}
interface Election {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  status: string
  createdAt: string
  _count?: { candidates: number; ballots: number }
}
interface ElectionDetail extends Election {
  candidates: Candidate[]
  ballots: any[]
}
interface Member { id: string; matricule: string; firstName: string; lastName: string }

const emptyForm = { name: "", description: "", startDate: "", endDate: "" }

const POSITIONS = [
  "Président", "Vice-président", "Secrétaire général", "Trésorier",
  "Trésorier adjoint", "Commissaire aux comptes", "Responsable communication", "Membre du bureau",
]

export default function ElectionsModule() {
  const [items, setItems] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")
  const [stats, setStats] = useState({ open: 0, candidates: 0, ballots: 0 })

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<ElectionDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [newCandidate, setNewCandidate] = useState("")
  const [newPosition, setNewPosition] = useState("Président")
  const [newProgram, setNewProgram] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    const res = await fetch(`/api/elections?${params}`)
    const data = await res.json()
    setItems(data)
    setStats({
      open: data.filter((e: Election) => e.status === "OPEN").length,
      candidates: data.reduce((s: number, e: Election) => s + (e._count?.candidates ?? 0), 0),
      ballots: data.reduce((s: number, e: Election) => s + (e._count?.ballots ?? 0), 0),
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
    if (!form.name.trim()) { toast.error("Le nom est requis"); return }
    if (!form.startDate || !form.endDate) { toast.error("Les dates sont requises"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Élection créée")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(e: Election) {
    if (!confirm(`Supprimer l'élection "${e.name}" ?`)) return
    const res = await fetch(`/api/elections/${e.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Élection supprimée"); load() }
    else toast.error("Échec")
  }

  async function openDetail(e: Election) {
    setDetailOpen(true); setDetailLoading(true)
    const res = await fetch(`/api/elections/${e.id}`)
    const data = await res.json()
    setDetail(data)
    setDetailLoading(false)
    loadMembers()
  }

  async function reloadDetail() {
    if (!detail) return
    const res = await fetch(`/api/elections/${detail.id}`)
    const data = await res.json()
    setDetail(data)
  }

  async function addCandidate() {
    if (!detail || !newCandidate) return
    const res = await fetch(`/api/elections/${detail.id}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: newCandidate, position: newPosition, program: newProgram }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data?.error || "Erreur"); return }
    toast.success("Candidat ajouté")
    setNewCandidate("")
    setNewProgram("")
    reloadDetail()
    load()
  }

  async function removeCandidate(c: Candidate) {
    if (!detail) return
    if (!confirm(`Retirer la candidature de ${c.member.firstName} ${c.member.lastName} ?`)) return
    const res = await fetch(`/api/elections/${detail.id}/candidates?candidateId=${c.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Candidature retirée"); reloadDetail(); load() }
    else toast.error("Échec")
  }

  async function closeElection() {
    if (!detail) return
    if (!confirm(`Clôturer l'élection "${detail.name}" ? Les votes ne seront plus possibles.`)) return
    const res = await fetch(`/api/elections/${detail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    })
    if (res.ok) { toast.success("Élection clôturée"); reloadDetail(); load() }
    else toast.error("Échec")
  }

  // Group candidates by position
  const candidatesByPosition = useMemo(() => {
    if (!detail) return [] as { position: string; candidates: Candidate[] }[]
    const map = new Map<string, Candidate[]>()
    for (const c of detail.candidates) {
      if (!map.has(c.position)) map.set(c.position, [])
      map.get(c.position)!.push(c)
    }
    return Array.from(map.entries()).map(([position, candidates]) => ({
      position,
      candidates: candidates.sort((a, b) => b.voteCount - a.voteCount),
    }))
  }, [detail])

  // Chart data — for the largest position (or first)
  const chartData = useMemo(() => {
    if (candidatesByPosition.length === 0) return []
    return candidatesByPosition[0].candidates.map((c) => ({
      name: `${c.member.firstName} ${c.member.lastName}`,
      voix: c.voteCount,
    }))
  }, [candidatesByPosition])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Élections"
        description="Gestion des campagnes électorales, candidatures et résultats"
        icon={Vote}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-2">
            <SquarePlus className="h-4 w-4" /> Nouvelle élection
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Élections ouvertes" value={stats.open} icon={Vote} tone="success" />
        <StatCard title="Total candidats" value={stats.candidates} icon={UserPlus} tone="info" />
        <StatCard title="Votes exprimés" value={stats.ballots} icon={BarChart3} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom, description…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <EmptyState icon={Vote} title="Aucune élection" description="Créez votre première élection." action={<Button onClick={openCreate} className="gap-2"><SquarePlus className="h-4 w-4" /> Nouvelle élection</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Élection</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Candidats</TableHead>
                  <TableHead className="text-center">Votes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => openDetail(e)}>
                    <TableCell>
                      <p className="font-medium">{e.name}</p>
                      {e.description && <p className="text-xs text-muted-foreground line-clamp-1">{e.description}</p>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <p>{formatDate(e.startDate)}</p>
                      <p className="text-xs text-muted-foreground">→ {formatDate(e.endDate)}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_TONES[e.status]}>{STATUS_LABELS[e.status] ?? e.status}</Badge></TableCell>
                    <TableCell className="text-center">{e._count?.candidates ?? 0}</TableCell>
                    <TableCell className="text-center">{e._count?.ballots ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(e)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>Nouvelle élection</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Field label="Nom de l'élection *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            </div>
            <Field label="Date de début *"><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Date de fin *"><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Créer"}</Button>
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
                  <div className="rounded-lg bg-primary/10 text-primary p-2"><Vote className="h-5 w-5" /></div>
                  <div>
                    <p>{detail.name}</p>
                    <SheetDescription>{formatDate(detail.startDate)} → {formatDate(detail.endDate)}</SheetDescription>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={STATUS_TONES[detail.status]}>{STATUS_LABELS[detail.status] ?? detail.status}</Badge>
                  <Badge variant="outline">{detail.candidates.length} candidats</Badge>
                  <Badge variant="outline">{detail.ballots.length} votes</Badge>
                </div>
                {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}

                {/* Add candidate */}
                {detail.status === "OPEN" && (
                  <SectionCard title="Ajouter un candidat">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Select value={newCandidate} onValueChange={setNewCandidate}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un membre…" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {members
                            .filter((m) => !detail.candidates.some((c) => c.memberId === m.id))
                            .map((m) => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.matricule}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={newPosition} onValueChange={setNewPosition}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="sm:col-span-2">
                        <Textarea rows={2} placeholder="Programme / projet du candidat…" value={newProgram} onChange={(e) => setNewProgram(e.target.value)} />
                      </div>
                      <Button className="sm:col-span-2 gap-2" onClick={addCandidate} disabled={!newCandidate}>
                        <UserPlus className="h-4 w-4" /> Ajouter la candidature
                      </Button>
                    </div>
                  </SectionCard>
                )}

                {/* Results chart */}
                {chartData.length > 0 && (
                  <SectionCard title={`Résultats — ${candidatesByPosition[0].position}`}>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="voix" name="Voix" fill="oklch(0.55 0.13 165)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                )}

                {/* Candidates by position */}
                <SectionCard title={`Candidats par poste (${detail.candidates.length})`}>
                  {candidatesByPosition.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun candidat pour l'instant.</p>
                  ) : (
                    <div className="space-y-4">
                      {candidatesByPosition.map(({ position, candidates }) => {
                        const maxVotes = Math.max(...candidates.map((c) => c.voteCount), 1)
                        return (
                          <div key={position}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-sm">{position}</p>
                              <Badge variant="outline" className="text-xs">{candidates.length} candidat{candidates.length > 1 ? "s" : ""}</Badge>
                            </div>
                            <div className="space-y-2">
                              {candidates.map((c) => (
                                <div key={c.id} className="rounded-lg border p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{c.member.firstName} {c.member.lastName}</p>
                                      <p className="text-xs text-muted-foreground">{c.member.matricule} · {c.member.faculty ?? "—"}</p>
                                      {c.program && <p className="text-xs mt-1 text-muted-foreground line-clamp-2">{c.program}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="bg-primary/10 text-primary">{c.voteCount} voix</Badge>
                                      {detail.status === "OPEN" && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCandidate(c)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-2">
                                    <Progress value={(c.voteCount / maxVotes) * 100} className="h-1.5" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </SectionCard>

                {detail.status === "OPEN" && (
                  <Button className="w-full gap-2" variant="outline" onClick={closeElection}>
                    <Lock className="h-4 w-4" /> Clôturer l'élection
                  </Button>
                )}
                {detail.status === "CLOSED" && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Élection clôturée — résultats définitifs
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}
