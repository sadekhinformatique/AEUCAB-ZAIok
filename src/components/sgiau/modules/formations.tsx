"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { GraduationCap, Plus, Pencil, Trash2, Search, UserPlus, UserMinus, Award, QrCode } from "lucide-react"
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { formatDate, initials } from "@/lib/sgiau/format"
import { QrBlock } from "@/components/sgiau/qr-block"

interface MiniMember { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; level: string | null }

interface FormationList {
  id: string; title: string; trainer: string; startDate: string; endDate: string | null
  location: string | null; budget: number; _count: { participants: number }
}

interface Participant {
  id: string; memberId: string; attended: boolean; certificateUrl: string | null; registeredAt: string
  member: { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; level: string | null; email: string | null; phone: string | null }
}

interface FormationDetail extends FormationList {
  description: string | null; documentUrl: string | null
  participants: Participant[]
}

const emptyForm = {
  title: "", description: "", trainer: "", startDate: "", endDate: "", location: "", budget: "",
}

export default function FormationsModule() {
  const [items, setItems] = useState<FormationList[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  const [editing, setEditing] = useState<FormationList | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<FormationDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const [members, setMembers] = useState<MiniMember[]>([])
  const [addMember, setAddMember] = useState<string>("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    const res = await fetch(`/api/formations?${params}`)
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [q])

  useEffect(() => { load() }, [load])

  const stats = {
    total: items.length,
    upcoming: items.filter((f) => new Date(f.startDate) >= new Date()).length,
    participants: items.reduce((s, f) => s + (f._count?.participants ?? 0), 0),
    budget: items.reduce((s, f) => s + (f.budget ?? 0), 0),
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function openEdit(f: FormationList) {
    setEditing(f)
    setForm({
      title: f.title, description: "", trainer: f.trainer,
      startDate: f.startDate ? f.startDate.slice(0, 10) : "",
      endDate: f.endDate ? f.endDate.slice(0, 10) : "",
      location: f.location ?? "", budget: f.budget?.toString() ?? "",
    })
    setFormOpen(true)
  }

  async function save() {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return }
    if (!form.trainer.trim()) { toast.error("Le formateur est requis"); return }
    if (!form.startDate) { toast.error("La date de début est requise"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/formations/${editing.id}` : "/api/formations", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Formation modifiée" : "Formation créée")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(f: FormationList) {
    if (!confirm(`Supprimer la formation « ${f.title} » ?`)) return
    const res = await fetch(`/api/formations/${f.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Formation supprimée"); load() }
    else toast.error("Échec de la suppression")
  }

  async function openDetail(f: FormationList) {
    setDetailOpen(true); setDetailLoading(true); setAddMember("")
    const [detRes, memRes] = await Promise.all([
      fetch(`/api/formations/${f.id}`),
      fetch("/api/members?limit=500"),
    ])
    const detData = await detRes.json()
    const memData = await memRes.json()
    setDetail(detData)
    setMembers(memData.map((m: MiniMember & { status: string }) => ({ id: m.id, matricule: m.matricule, firstName: m.firstName, lastName: m.lastName, faculty: m.faculty, level: m.level })))
    setDetailLoading(false)
  }

  async function addParticipant() {
    if (!detail || !addMember) return
    try {
      const res = await fetch(`/api/formations/${detail.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: addMember }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Participant inscrit")
      setAddMember("")
      // Refresh detail
      const dr = await fetch(`/api/formations/${detail.id}`)
      setDetail(await dr.json())
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function removeParticipant(p: Participant) {
    if (!detail) return
    if (!confirm(`Retirer ${p.member.firstName} ${p.member.lastName} de la formation ?`)) return
    const res = await fetch(`/api/formations/${detail.id}/participants?participantId=${p.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Participant retiré")
      const dr = await fetch(`/api/formations/${detail.id}`)
      setDetail(await dr.json())
      load()
    } else toast.error("Échec du retrait")
  }

  async function generateCertificate(p: Participant) {
    if (!detail) return
    try {
      const res = await fetch(`/api/formations/${detail.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "certificate", participantId: p.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Attestation générée")
      const dr = await fetch(`/api/formations/${detail.id}`)
      setDetail(await dr.json())
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const availableMembers = detail
    ? members.filter((m) => !detail.participants.some((p) => p.memberId === m.id))
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formations"
        description="Sessions de formation, participants et attestations"
        icon={GraduationCap}
        actions={<Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle formation</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total formations" value={stats.total} icon={GraduationCap} />
        <StatCard title="À venir" value={stats.upcoming} icon={GraduationCap} tone="info" />
        <StatCard title="Participants total" value={stats.participants} icon={UserPlus} tone="success" />
        <StatCard title="Budget total" value={<Money value={stats.budget} />} icon={GraduationCap} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Titre, formateur, lieu…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : items.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Aucune formation" description="Planifiez une première session." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle formation</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Formation</TableHead>
                  <TableHead>Formateur</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead className="hidden lg:table-cell">Lieu</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Budget</TableHead>
                  <TableHead className="text-center">Participants</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => openDetail(f)}>
                    <TableCell className="font-medium">{f.title}</TableCell>
                    <TableCell className="text-sm">{f.trainer}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(f.startDate)}{f.endDate ? ` → ${formatDate(f.endDate)}` : ""}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{f.location ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Money value={f.budget} /></TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{f._count?.participants ?? 0}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(f)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Field label="Formateur *">
              <Input value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} />
            </Field>
            <Field label="Lieu">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Date de début *">
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="Date de fin">
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
            <Field label="Budget (FCFA)">
              <Input type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Sheet open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetail(null) }}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto scroll-thin">
          {detailLoading || !detail ? (
            <div className="p-6"><LoadingState rows={5} /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {detail.title}
                </SheetTitle>
                <SheetDescription>Formé par {detail.trainer}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Début" value={formatDate(detail.startDate)} />
                  <Info label="Fin" value={formatDate(detail.endDate)} />
                  <Info label="Lieu" value={detail.location ?? "—"} />
                  <Info label="Budget" value={<Money value={detail.budget} />} />
                </div>
                {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}

                {/* QR présence */}
                <SectionCard title="QR de présence">
                  <div className="flex items-center gap-4">
                    <QrBlock value={`FORMATION-${detail.id}`} size={96} />
                    <div className="text-sm">
                      <p className="font-medium flex items-center gap-1"><QrCode className="h-3.5 w-3.5" /> Scan de présence</p>
                      <p className="text-xs text-muted-foreground mt-1">Présentez ce code aux participants pour enregistrer leur présence en session.</p>
                    </div>
                  </div>
                </SectionCard>

                {/* Participants */}
                <SectionCard title={`Participants (${detail.participants.length})`} actions={null}>
                  <div className="space-y-2 mb-3">
                    <Label className="text-xs font-medium">Inscrire un membre</Label>
                    <div className="flex gap-2">
                      <Select value={addMember} onValueChange={setAddMember}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un membre…" /></SelectTrigger>
                        <SelectContent>
                          {availableMembers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.matricule}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addParticipant} disabled={!addMember} className="gap-2"><UserPlus className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  {detail.participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">Aucun participant inscrit.</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
                      {detail.participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 rounded-lg border p-2">
                          <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(p.member.firstName, p.member.lastName)}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.member.firstName} {p.member.lastName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{p.member.matricule} · {p.member.faculty ?? "—"}</p>
                          </div>
                          {p.certificateUrl ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 gap-1"><Award className="h-3 w-3" /> Attestation</Badge>
                          ) : (
                            <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => generateCertificate(p)} title="Générer attestation">
                              <Award className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeParticipant(p)}><UserMinus className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => { setDetailOpen(false); openEdit(detail) }}>
                  <Pencil className="h-4 w-4" /> Modifier la formation
                </Button>
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
