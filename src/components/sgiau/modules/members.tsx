"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { Users, UserPlus, Search, Download, Upload, Trash2, Pencil, QrCode, FileText, Filter } from "lucide-react"
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  MEMBER_STATUS_COLORS, MEMBER_STATUS_LABELS, FILIERES, LEVELS, LEVEL_LABELS,
  isAP, birthDateError, ageFromBirthDate, MIN_STUDENT_AGE, MAX_STUDENT_AGE,
} from "@/lib/sgiau/constants"
import { formatDate, formatDateTime, toCSV, downloadCSV, initials } from "@/lib/sgiau/format"
import { QrBlock } from "@/components/sgiau/qr-block"
import { useSgiau } from "@/lib/sgiau/store"

interface Member {
  id: string; matricule: string; firstName: string; lastName: string; sex: string
  birthDate: string | null; phone: string | null; email: string | null; address: string | null
  faculty: string | null; department: string | null; level: string | null; academicYear: string | null
  status: string; qrCode: string | null; createdAt: string; _count?: { payments: number }
}

interface MemberDetail extends Member {
  adhesion: any | null; card: any | null
  payments: any[]; receipts: any[]
  _count: { payments: number; presences: number; activities: number; meetings: number; votes: number }
}

const emptyForm = { firstName: "", lastName: "", sex: "M", birthDate: "", phone: "", email: "", address: "", faculty: "", department: "", level: "", academicYear: "2024-2025", status: "ACTIVE" }

// Bornes du sélecteur de date : étudiants de 18 à 70 ans (règles Sénégal)
const minBirthDate = `${new Date().getFullYear() - MAX_STUDENT_AGE}-01-01`
const maxBirthDate = `${new Date().getFullYear() - MIN_STUDENT_AGE}-12-31`

export default function MembersModule() {
  const { setModule } = useSgiau()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")
  const [faculty, setFaculty] = useState("ALL")
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, suspended: 0 })

  const [editing, setEditing] = useState<Member | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    if (faculty !== "ALL") params.set("faculty", faculty)
    const res = await fetch(`/api/members?${params}`)
    const data = await res.json()
    setMembers(data)
    const s = { total: data.length, active: 0, pending: 0, suspended: 0 }
    for (const m of data) {
      if (m.status === "ACTIVE") s.active++
      else if (m.status === "PENDING") s.pending++
      else if (m.status === "SUSPENDED") s.suspended++
    }
    setStats(s)
    setLoading(false)
  }, [q, status, faculty])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function openEdit(m: Member) {
    setEditing(m)
    setForm({
      firstName: m.firstName, lastName: m.lastName, sex: m.sex,
      birthDate: m.birthDate ? m.birthDate.slice(0, 10) : "",
      phone: m.phone ?? "", email: m.email ?? "", address: m.address ?? "",
      faculty: m.faculty ?? "", department: m.department ?? "", level: m.level ?? "",
      academicYear: m.academicYear ?? "", status: m.status,
    })
    setFormOpen(true)
  }

  async function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Le nom et le prénom sont requis")
      return
    }
    const bdError = birthDateError(form.birthDate)
    if (bdError) {
      toast.error(bdError)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/members/${editing.id}` : "/api/members", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Membre modifié" : "Membre créé")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(m: Member) {
    if (!confirm(`Supprimer le membre ${m.firstName} ${m.lastName} (${m.matricule}) ?`)) return
    const res = await fetch(`/api/members/${m.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Membre supprimé")
      load()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error || "Échec de la suppression")
    }
  }

  async function openDetail(m: Member) {
    setDetailOpen(true); setDetailLoading(true)
    const res = await fetch(`/api/members/${m.id}`)
    const data = await res.json()
    setDetail(data); setDetailLoading(false)
  }

  function exportCSV() {
    const rows = members.map((m) => ({
      matricule: m.matricule, prenom: m.firstName, nom: m.lastName, sexe: m.sex,
      naissance: formatDate(m.birthDate), telephone: m.phone, email: m.email,
      faculte: m.faculty, departement: m.department, niveau: m.level, annee: m.academicYear,
      statut: MEMBER_STATUS_LABELS[m.status],
    }))
    downloadCSV(`membres-${Date.now()}.csv`, toCSV(rows))
    toast.success(`${rows.length} membres exportés`)
  }

  function importCSV(file: File) {
    const reader = new FileReader()
    reader.onload = async () => {
      const text = String(reader.result)
      const lines = text.split(/\r?\n/).filter(Boolean)
      if (lines.length < 2) { toast.error("Fichier vide"); return }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
      let okCount = 0
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(",").map((c) => c.replace(/^"|"$/g, ""))
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => (row[h] = cells[idx] ?? ""))
        const payload = {
          firstName: row.prenom || row.firstName || "",
          lastName: row.nom || row.lastName || "",
          sex: (row.sexe || row.sex || "M").toUpperCase().startsWith("F") ? "F" : "M",
          phone: row.telephone || row.phone || "",
          email: row.email || "",
          faculty: row.faculte || row.filiere || row.faculty || "",
          department: row.departement || row.department || row.filiere || "",
          level: row.niveau || row.level || "",
          academicYear: row.annee || "2024-2025",
          status: "ACTIVE",
        }
        if (payload.firstName && payload.lastName) {
          await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          okCount++
        }
      }
      toast.success(`${okCount} membres importés`)
      load()
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des membres"
        description="Annuaire, fiches, statuts et codes QR des membres de l'amicale"
        icon={Users}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <label>
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer" asChild>
                <span><Upload className="h-4 w-4" /> Importer</span>
              </Button>
            </label>
            <Button size="sm" onClick={openCreate} className="gap-2">
              <UserPlus className="h-4 w-4" /> Nouveau membre
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total membres" value={stats.total} icon={Users} />
        <StatCard title="Actifs" value={stats.active} icon={UserPlus} tone="success" />
        <StatCard title="En attente" value={stats.pending} icon={UserPlus} tone="info" />
        <StatCard title="Suspendus" value={stats.suspended} icon={UserPlus} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom, matricule, email, téléphone…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(MEMBER_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={faculty} onValueChange={setFaculty}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Filière" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les filières</SelectItem>
              {FILIERES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={8} />
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="Aucun membre trouvé" description="Modifiez vos filtres ou créez un nouveau membre." action={<Button onClick={openCreate} className="gap-2"><UserPlus className="h-4 w-4" /> Nouveau membre</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Matricule</TableHead>
                  <TableHead className="hidden md:table-cell">Filière / Niveau</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => openDetail(m)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(m.firstName, m.lastName)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.sex === "F" ? "Femme" : "Homme"}{m.birthDate ? ` · ${formatDate(m.birthDate)}` : ""}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.matricule}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{m.faculty ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{m.department ?? "—"} · {m.level ?? "—"}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p className="text-sm">{m.phone ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{m.email ?? "—"}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={MEMBER_STATUS_COLORS[m.status]}>{MEMBER_STATUS_LABELS[m.status]}</Badge></TableCell>
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
            <DialogTitle>{editing ? "Modifier le membre" : "Nouveau membre"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <Field label="Prénom *"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Nom *"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Sexe">
              <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="M">Homme</SelectItem><SelectItem value="F">Femme</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Date de naissance">
              <Input type="date" min={minBirthDate} max={maxBirthDate} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
              {form.birthDate && (() => {
                const err = birthDateError(form.birthDate)
                const age = ageFromBirthDate(form.birthDate)
                return err ? (
                  <p className="text-xs text-rose-500">{err}</p>
                ) : age !== null ? (
                  <p className="text-xs text-muted-foreground">Âge calculé : <span className="font-medium">{age} ans</span></p>
                ) : null
              })()}
            </Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Filière">
              <Select value={form.faculty} onValueChange={(v) => setForm({ ...form, faculty: v, ...(isAP(v) ? { level: "" } : {}) })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{FILIERES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Département (option)"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="Niveau">
              <Select value={form.level} disabled={isAP(form.faculty)} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue placeholder={isAP(form.faculty) ? "Aucun niveau" : "—"} /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{LEVEL_LABELS[l]}</SelectItem>)}</SelectContent>
              </Select>
              {isAP(form.faculty) && <p className="text-xs text-muted-foreground">L'Année Préparatoire n'a pas de niveau.</p>}
            </Field>
            <Field label="Année universitaire"><Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></Field>
            <Field label="Statut">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MEMBER_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Adresse"><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
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
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary/15 text-primary">{initials(detail.firstName, detail.lastName)}</AvatarFallback></Avatar>
                  <div>
                    <p>{detail.firstName} {detail.lastName}</p>
                    <SheetDescription className="font-mono">{detail.matricule}</SheetDescription>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={MEMBER_STATUS_COLORS[detail.status]}>{MEMBER_STATUS_LABELS[detail.status]}</Badge>
                  {detail.card && <Badge variant="outline" className="bg-primary/10 text-primary">Carte {detail.card.cardNumber}</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Sexe" value={detail.sex === "F" ? "Femme" : "Homme"} />
                  <Info label="Naissance" value={formatDate(detail.birthDate)} />
                  <Info label="Téléphone" value={detail.phone ?? "—"} />
                  <Info label="Email" value={detail.email ?? "—"} />
                  <Info label="Filière" value={detail.faculty ?? "—"} />
                  <Info label="Département" value={detail.department ?? "—"} />
                  <Info label="Niveau" value={detail.level ?? "—"} />
                  <Info label="Année" value={detail.academicYear ?? "—"} />
                </div>
                {detail.address && <Info label="Adresse" value={detail.address} />}

                {/* QR Code */}
                {detail.qrCode && (
                  <SectionCard title="Carte membre — QR Code">
                    <div className="flex items-center gap-4">
                      <QrBlock value={detail.qrCode} size={110} />
                      <div className="text-sm">
                        <p className="font-mono text-xs text-muted-foreground">{detail.qrCode}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Présentez ce code pour les présences, votes et vérifications.</p>
                      </div>
                    </div>
                  </SectionCard>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Paiements" value={detail._count.payments} onClick={() => setModule("cotisations")} />
                  <MiniStat label="Activités" value={detail._count.activities} onClick={() => setModule("activities")} />
                  <MiniStat label="Votes" value={detail._count.votes} onClick={() => setModule("votes")} />
                </div>

                {/* Recent payments */}
                <SectionCard title="Derniers paiements">
                  {detail.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun paiement.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto scroll-thin">
                      {detail.payments.slice(0, 8).map((p) => (
                        <div key={p.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <div>
                            <p className="font-medium">{p.cotisationType?.name ?? "Cotisation"}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)} · {p.reference}</p>
                          </div>
                          <span className="font-semibold"><Money value={p.amountPaid} /></span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => { setDetailOpen(false); openEdit(detail) }}>
                    <Pencil className="h-4 w-4" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => setModule("receipts")}>
                    <FileText className="h-4 w-4" /> Reçus
                  </Button>
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
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
function MiniStat({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg border p-3 text-center hover:bg-accent transition-colors">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  )
}
