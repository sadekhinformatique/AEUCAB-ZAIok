"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { UsersRound, CalendarPlus, Search, Trash2, Pencil, MapPin, CheckCircle2, Clock, Percent, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { formatDate, formatDateTime } from "@/lib/sgiau/format"

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Planifiée",
  DONE: "Effectuée",
  CANCELLED: "Annulée",
}
const STATUS_TONES: Record<string, string> = {
  SCHEDULED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

interface MeetingParticipant {
  id: string
  memberId: string
  attended: boolean
  excuse: string | null
  member: { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; phone: string | null }
}
interface Meeting {
  id: string
  title: string
  agenda: string | null
  decisions: string | null
  pvUrl: string | null
  startDate: string
  endDate: string | null
  location: string | null
  status: string
  createdAt: string
  _count?: { participants: number; attended: number }
}
interface MeetingDetail extends Meeting {
  participants: MeetingParticipant[]
}
interface Member { id: string; matricule: string; firstName: string; lastName: string }

const emptyForm = {
  title: "", agenda: "", startDate: "", endDate: "", location: "",
}

export default function MeetingsModule() {
  const [items, setItems] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")
  const [stats, setStats] = useState({ total: 0, upcoming: 0, done: 0, attendance: 0 })

  const [editing, setEditing] = useState<Meeting | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<MeetingDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [newParticipant, setNewParticipant] = useState("")
  const [decisionsDraft, setDecisionsDraft] = useState("")
  const [pvUrl, setPvUrl] = useState("")
  const [savingDecisions, setSavingDecisions] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    const res = await fetch(`/api/meetings?${params}`)
    const data = await res.json()
    setItems(data)
    const now = new Date()
    let totalAttended = 0, totalParticipants = 0
    for (const m of data) {
      totalAttended += m._count?.attended ?? 0
      totalParticipants += m._count?.participants ?? 0
    }
    setStats({
      total: data.length,
      upcoming: data.filter((m: Meeting) => m.status === "SCHEDULED" && new Date(m.startDate) > now).length,
      done: data.filter((m: Meeting) => m.status === "DONE").length,
      attendance: totalParticipants > 0 ? Math.round((totalAttended / totalParticipants) * 100) : 0,
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

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function openEdit(m: Meeting) {
    setEditing(m)
    setForm({
      title: m.title, agenda: m.agenda ?? "",
      startDate: m.startDate ? m.startDate.slice(0, 16) : "",
      endDate: m.endDate ? m.endDate.slice(0, 16) : "",
      location: m.location ?? "",
    })
    setFormOpen(true)
  }

  async function save() {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return }
    if (!form.startDate) { toast.error("La date de début est requise"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/meetings/${editing.id}` : "/api/meetings", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Réunion modifiée" : "Réunion créée")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(m: Meeting) {
    if (!confirm(`Supprimer la réunion "${m.title}" ?`)) return
    const res = await fetch(`/api/meetings/${m.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Réunion supprimée"); load() }
    else toast.error("Échec")
  }

  async function openDetail(m: Meeting) {
    setDetailOpen(true); setDetailLoading(true)
    const res = await fetch(`/api/meetings/${m.id}`)
    const data = await res.json()
    setDetail(data)
    setDecisionsDraft(data.decisions ?? "")
    setPvUrl(data.pvUrl ?? "")
    setDetailLoading(false)
    loadMembers()
  }

  async function reloadDetail() {
    if (!detail) return
    const res = await fetch(`/api/meetings/${detail.id}`)
    const data = await res.json()
    setDetail(data)
    setDecisionsDraft(data.decisions ?? "")
    setPvUrl(data.pvUrl ?? "")
  }

  async function addParticipant() {
    if (!detail || !newParticipant) return
    const res = await fetch(`/api/meetings/${detail.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: newParticipant }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data?.error || "Erreur"); return }
    toast.success("Participant ajouté")
    setNewParticipant("")
    reloadDetail()
  }

  async function toggleAttended(p: MeetingParticipant, attended: boolean) {
    if (!detail) return
    const res = await fetch(`/api/meetings/${detail.id}/participants/${p.memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended }),
    })
    if (res.ok) {
      toast.success(attended ? "Présence enregistrée" : "Absence enregistrée")
      reloadDetail()
    } else toast.error("Échec")
  }

  async function removeParticipant(memberId: string, name: string) {
    if (!detail) return
    if (!confirm(`Retirer ${name} de la réunion ?`)) return
    const res = await fetch(`/api/meetings/${detail.id}/participants?memberId=${memberId}`, { method: "DELETE" })
    if (res.ok) { toast.success("Participant retiré"); reloadDetail() }
    else toast.error("Échec")
  }

  async function saveDecisions() {
    if (!detail) return
    setSavingDecisions(true)
    const res = await fetch(`/api/meetings/${detail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions: decisionsDraft, pvUrl }),
    })
    if (res.ok) { toast.success("Décisions et PV enregistrés"); reloadDetail() }
    else toast.error("Échec")
    setSavingDecisions(false)
  }

  async function markDone() {
    if (!detail) return
    const res = await fetch(`/api/meetings/${detail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    })
    if (res.ok) { toast.success("Réunion marquée comme effectuée"); reloadDetail(); load() }
    else toast.error("Échec")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réunions"
        description="Ordres du jour, comptes rendus, présences et décisions"
        icon={UsersRound}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-2">
            <CalendarPlus className="h-4 w-4" /> Nouvelle réunion
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total réunions" value={stats.total} icon={UsersRound} />
        <StatCard title="À venir" value={stats.upcoming} icon={Clock} tone="info" />
        <StatCard title="Effectuées" value={stats.done} icon={CheckCircle2} tone="success" />
        <StatCard title="Taux de présence" value={`${stats.attendance}%`} icon={Percent} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Titre, lieu, ordre du jour…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <LoadingState rows={6} />
        ) : items.length === 0 ? (
          <EmptyState icon={UsersRound} title="Aucune réunion trouvée" description="Planifiez votre première réunion." action={<Button onClick={openCreate} className="gap-2"><CalendarPlus className="h-4 w-4" /> Nouvelle réunion</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Réunion</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Lieu</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Présents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => openDetail(m)}>
                    <TableCell>
                      <p className="font-medium">{m.title}</p>
                      {m.location && <p className="text-xs text-muted-foreground md:hidden flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</p>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <p>{formatDate(m.startDate)}</p>
                      {m.endDate && <p className="text-xs text-muted-foreground">→ {formatDate(m.endDate)}</p>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{m.location ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_TONES[m.status]}>{STATUS_LABELS[m.status] ?? m.status}</Badge></TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="font-medium">{m._count?.attended ?? 0}</span>
                      <span className="text-muted-foreground"> / {m._count?.participants ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(m)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editing ? "Modifier la réunion" : "Nouvelle réunion"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Field label="Titre *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            </div>
            <Field label="Date de début *"><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Date de fin"><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Lieu"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Ordre du jour"><Textarea rows={4} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} placeholder="Points à aborder pendant la réunion…" /></Field>
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
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto scroll-thin">
          {detailLoading || !detail ? (
            <div className="p-6"><LoadingState rows={4} /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 text-primary p-2"><UsersRound className="h-5 w-5" /></div>
                  <div>
                    <p>{detail.title}</p>
                    <SheetDescription>{formatDateTime(detail.startDate)}</SheetDescription>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={STATUS_TONES[detail.status]}>{STATUS_LABELS[detail.status] ?? detail.status}</Badge>
                  {detail.location && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{detail.location}</Badge>}
                </div>

                {detail.agenda && (
                  <SectionCard title="Ordre du jour">
                    <p className="text-sm whitespace-pre-wrap">{detail.agenda}</p>
                  </SectionCard>
                )}

                {/* Decisions editable */}
                <SectionCard title="Décisions et PV">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">Décisions</Label>
                      <Textarea rows={4} className="mt-1" value={decisionsDraft} onChange={(e) => setDecisionsDraft(e.target.value)} placeholder="Décisions prises pendant la réunion…" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Lien du PV (URL)</Label>
                      <Input className="mt-1" value={pvUrl} onChange={(e) => setPvUrl(e.target.value)} placeholder="https://…" />
                    </div>
                    <Button size="sm" onClick={saveDecisions} disabled={savingDecisions}>
                      {savingDecisions ? "Enregistrement…" : "Enregistrer les décisions"}
                    </Button>
                  </div>
                </SectionCard>

                {/* Participants with attended checkbox */}
                <SectionCard title={`Participants (${detail.participants.length})`}>
                  <div className="flex gap-2 mb-3">
                    <Select value={newParticipant} onValueChange={setNewParticipant}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Sélectionner un membre…" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {members
                          .filter((m) => !detail.participants.some((p) => p.memberId === m.id))
                          .map((m) => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.matricule}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={addParticipant} disabled={!newParticipant}>Ajouter</Button>
                  </div>
                  {detail.participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun participant enregistré.</p>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto scroll-thin">
                      {detail.participants.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                          <div className="flex items-center gap-2 flex-1">
                            <Checkbox
                              checked={p.attended}
                              onCheckedChange={(v) => toggleAttended(p, Boolean(v))}
                            />
                            <div>
                              <p className="font-medium">{p.member.firstName} {p.member.lastName}</p>
                              <p className="text-xs text-muted-foreground">{p.member.matricule}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeParticipant(p.memberId, `${p.member.firstName} ${p.member.lastName}`)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between border-t pt-2">
                    <span>Présents : <strong>{detail.participants.filter((p) => p.attended).length}</strong> / {detail.participants.length}</span>
                    {detail.participants.length > 0 && (
                      <span>{Math.round((detail.participants.filter((p) => p.attended).length / detail.participants.length) * 100)}%</span>
                    )}
                  </div>
                </SectionCard>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => { setDetailOpen(false); openEdit(detail) }}>
                    <Pencil className="h-4 w-4" /> Modifier
                  </Button>
                  {detail.pvUrl && (
                    <Button variant="outline" size="sm" className="gap-2 flex-1" asChild>
                      <a href={detail.pvUrl} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" /> Voir le PV</a>
                    </Button>
                  )}
                  {detail.status !== "DONE" && (
                    <Button size="sm" className="gap-2 flex-1" onClick={markDone}>
                      <CheckCircle2 className="h-4 w-4" /> Marquer effectuée
                    </Button>
                  )}
                </div>
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
