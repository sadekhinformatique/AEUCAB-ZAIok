"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { CalendarDays, CalendarPlus, Search, Download, Trash2, Pencil, QrCode, MapPin, Users, CheckCircle2, Wallet, TrendingDown } from "lucide-react"
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
import { toast } from "sonner"
import { ACTIVITY_STATUS_LABELS } from "@/lib/sgiau/constants"
import { formatDate, formatDateTime, toCSV, downloadCSV } from "@/lib/sgiau/format"
import { QrBlock } from "@/components/sgiau/qr-block"
import { useSgiau } from "@/lib/sgiau/store"
import { cn } from "@/lib/utils"

const ACTIVITY_TYPES = [
  { value: "EVENT", label: "Événement" },
  { value: "OUTING", label: "Sortie" },
  { value: "TRAINING", label: "Formation" },
  { value: "CONFERENCE", label: "Conférence" },
]
const TYPE_LABELS: Record<string, string> = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.value, t.label]))

const STATUS_TONES: Record<string, string> = {
  PLANNED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  ONGOING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

interface ActivityParticipant {
  id: string
  memberId: string
  role: string
  registeredAt: string
  member: { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null }
}
interface Expense { id: string; reference: string; label: string; amount: number; status: string; date: string }
interface Activity {
  id: string
  name: string
  description: string | null
  type: string
  startDate: string
  endDate: string | null
  location: string | null
  budget: number
  status: string
  createdAt: string
  _count?: { participants: number; expenses: number; presences: number }
}
interface ActivityDetail extends Activity {
  participants: ActivityParticipant[]
  expenses: Expense[]
  presences: { id: string; method: string; checkInAt: string; member: { matricule: string; firstName: string; lastName: string } }[]
}
interface Member { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null }

const emptyForm = {
  name: "", type: "EVENT", startDate: "", endDate: "",
  location: "", budget: 0, description: "", status: "PLANNED",
}

export default function ActivitiesModule() {
  const { setModule } = useSgiau()
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")
  const [stats, setStats] = useState({ total: 0, planned: 0, done: 0, budget: 0 })

  const [editing, setEditing] = useState<Activity | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<ActivityDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [newParticipant, setNewParticipant] = useState("")
  const [adding, setAdding] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    const res = await fetch(`/api/activities?${params}`)
    const data = await res.json()
    setItems(data)
    setStats({
      total: data.length,
      planned: data.filter((a: Activity) => a.status === "PLANNED").length,
      done: data.filter((a: Activity) => a.status === "DONE").length,
      budget: data.reduce((s: number, a: Activity) => s + (a.budget || 0), 0),
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
  function openEdit(a: Activity) {
    setEditing(a)
    setForm({
      name: a.name, type: a.type, status: a.status,
      startDate: a.startDate ? a.startDate.slice(0, 16) : "",
      endDate: a.endDate ? a.endDate.slice(0, 16) : "",
      location: a.location ?? "", budget: a.budget ?? 0,
      description: a.description ?? "",
    })
    setFormOpen(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Le nom est requis"); return }
    if (!form.startDate) { toast.error("La date de début est requise"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/activities/${editing.id}` : "/api/activities", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Activité modifiée" : "Activité créée")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(a: Activity) {
    if (!confirm(`Supprimer l'activité "${a.name}" ?`)) return
    const res = await fetch(`/api/activities/${a.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Activité supprimée"); load() }
    else toast.error("Échec de la suppression")
  }

  async function openDetail(a: Activity) {
    setDetailOpen(true); setDetailLoading(true); setShowQR(false)
    const res = await fetch(`/api/activities/${a.id}`)
    const data = await res.json()
    setDetail(data)
    setDetailLoading(false)
    loadMembers()
  }

  async function reloadDetail() {
    if (!detail) return
    const res = await fetch(`/api/activities/${detail.id}`)
    const data = await res.json()
    setDetail(data)
  }

  async function addParticipant() {
    if (!detail || !newParticipant) return
    setAdding(true)
    try {
      const res = await fetch(`/api/activities/${detail.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: newParticipant, role: "PARTICIPANT" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Participant ajouté")
      setNewParticipant("")
      reloadDetail()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  async function removeParticipant(memberId: string, name: string) {
    if (!detail) return
    if (!confirm(`Retirer ${name} de l'activité ?`)) return
    const res = await fetch(`/api/activities/${detail.id}/participants?memberId=${memberId}`, { method: "DELETE" })
    if (res.ok) { toast.success("Participant retiré"); reloadDetail() }
    else toast.error("Échec du retrait")
  }

  async function markDone() {
    if (!detail) return
    const res = await fetch(`/api/activities/${detail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    })
    if (res.ok) { toast.success("Activité marquée comme terminée"); reloadDetail(); load() }
    else toast.error("Échec")
  }

  function exportCSV() {
    const rows = items.map((a) => ({
      nom: a.name, type: TYPE_LABELS[a.type] ?? a.type,
      debut: formatDate(a.startDate), fin: formatDate(a.endDate),
      lieu: a.location ?? "", budget: a.budget,
      statut: ACTIVITY_STATUS_LABELS[a.status] ?? a.status,
      participants: a._count?.participants ?? 0,
    }))
    downloadCSV(`activites-${Date.now()}.csv`, toCSV(rows))
    toast.success(`${rows.length} activités exportées`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activités"
        description="Événements, sorties, formations et conférences de l'amicale"
        icon={CalendarDays}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-2">
              <CalendarPlus className="h-4 w-4" /> Nouvelle activité
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total activités" value={stats.total} icon={CalendarDays} />
        <StatCard title="Planifiées" value={stats.planned} icon={CalendarPlus} tone="info" />
        <StatCard title="Terminées" value={stats.done} icon={CheckCircle2} tone="success" />
        <StatCard title="Budget total" value={<Money value={stats.budget} />} icon={Wallet} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom, lieu, description…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(ACTIVITY_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Aucune activité trouvée" description="Créez votre première activité ou modifiez vos filtres." action={<Button onClick={openCreate} className="gap-2"><CalendarPlus className="h-4 w-4" /> Nouvelle activité</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Activité</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Dates</TableHead>
                  <TableHead className="hidden xl:table-cell">Lieu</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Participants</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => openDetail(a)}>
                    <TableCell>
                      <p className="font-medium">{a.name}</p>
                      {a.location && <p className="text-xs text-muted-foreground md:hidden flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</p>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline">{TYPE_LABELS[a.type] ?? a.type}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      <p>{formatDate(a.startDate)}</p>
                      {a.endDate && <p className="text-xs text-muted-foreground">→ {formatDate(a.endDate)}</p>}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">{a.location ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm"><Money value={a.budget} /></TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_TONES[a.status]}>{ACTIVITY_STATUS_LABELS[a.status] ?? a.status}</Badge></TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm"><Users className="h-3.5 w-3.5" />{a._count?.participants ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(a)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editing ? "Modifier l'activité" : "Nouvelle activité"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Field label="Nom de l'activité *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            </div>
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Statut">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACTIVITY_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Date de début *"><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Date de fin"><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            <Field label="Lieu"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Budget (FCFA)"><Input type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) { setDetail(null); setShowQR(false) } }}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto scroll-thin">
          {detailLoading || !detail ? (
            <div className="p-6"><LoadingState rows={4} /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 text-primary p-2"><CalendarDays className="h-5 w-5" /></div>
                  <div>
                    <p>{detail.name}</p>
                    <SheetDescription>{TYPE_LABELS[detail.type] ?? detail.type}</SheetDescription>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={STATUS_TONES[detail.status]}>{ACTIVITY_STATUS_LABELS[detail.status] ?? detail.status}</Badge>
                  <Badge variant="outline">{TYPE_LABELS[detail.type] ?? detail.type}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Date de début" value={formatDateTime(detail.startDate)} />
                  <Info label="Date de fin" value={formatDateTime(detail.endDate)} />
                  <Info label="Lieu" value={detail.location ?? "—"} />
                  <Info label="Budget" value={<Money value={detail.budget} />} />
                </div>
                {detail.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm whitespace-pre-wrap">{detail.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Participants" value={detail._count?.participants ?? detail.participants.length} />
                  <MiniStat label="Présences" value={detail._count?.presences ?? detail.presences.length} />
                  <MiniStat label="Dépenses" value={detail._count?.expenses ?? detail.expenses.length} />
                </div>

                {/* Presence QR */}
                <SectionCard title="QR Code de présence">
                  {!showQR ? (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowQR(true)}>
                      <QrCode className="h-4 w-4" /> Générer le QR de présence
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <QrBlock value={`SGIAU-ACT-${detail.id}`} size={120} />
                      <div className="text-sm">
                        <p className="font-mono text-xs text-muted-foreground">SGIAU-ACT-{detail.id.slice(-8)}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Affichez ce QR à l'entrée pour enregistrer les présences des membres.</p>
                        <Button variant="link" size="sm" className="h-auto p-0 mt-2" onClick={() => setModule("presences")}>Voir le module présences →</Button>
                      </div>
                    </div>
                  )}
                </SectionCard>

                {/* Participants */}
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
                    <Button size="sm" onClick={addParticipant} disabled={adding || !newParticipant}>Ajouter</Button>
                  </div>
                  {detail.participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun participant enregistré.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto scroll-thin">
                      {detail.participants.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                          <div>
                            <p className="font-medium">{p.member.firstName} {p.member.lastName}</p>
                            <p className="text-xs text-muted-foreground">{p.member.matricule} · {p.role}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeParticipant(p.memberId, `${p.member.firstName} ${p.member.lastName}`)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Linked expenses */}
                <SectionCard title={`Dépenses liées (${detail.expenses.length})`}>
                  {detail.expenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune dépense liée.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto scroll-thin">
                      {detail.expenses.map((e) => (
                        <div key={e.id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                          <div>
                            <p className="font-medium">{e.label}</p>
                            <p className="text-xs text-muted-foreground">{e.reference} · {formatDate(e.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold"><Money value={e.amount} /></p>
                            <p className="text-xs text-muted-foreground">{e.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => { setDetailOpen(false); openEdit(detail) }}>
                    <Pencil className="h-4 w-4" /> Modifier
                  </Button>
                  {detail.status !== "DONE" && (
                    <Button size="sm" className="gap-2 flex-1" onClick={markDone}>
                      <CheckCircle2 className="h-4 w-4" /> Marquer terminée
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
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn("rounded-lg border p-3 text-center")}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
