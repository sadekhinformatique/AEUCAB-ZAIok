"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { Library, BookOpen, Search, Plus, Pencil, Trash2, BookMarked, ArrowLeftRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { formatDate } from "@/lib/sgiau/format"

interface Resource {
  id: string; title: string; author: string | null; category: string | null; isbn: string | null
  fileUrl: string | null; totalCopies: number; available: number; createdAt: string
  _count?: { borrows: number }
}

interface MiniMember { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null }

interface Borrow {
  id: string; resourceId: string; memberId: string
  borrowedAt: string; dueDate: string | null; returnedAt: string | null; status: string
  createdAt: string
  member: { id: string; matricule: string; firstName: string; lastName: string; phone: string | null; email: string | null }
  resource: { id: string; title: string; author: string | null; category: string | null }
}

const emptyForm = { title: "", author: "", category: "", isbn: "", totalCopies: "1" }
const BORROW_STATUS_LABELS: Record<string, string> = { BORROWED: "En cours", RETURNED: "Retourné", OVERDUE: "En retard" }
const BORROW_STATUS_COLORS: Record<string, string> = {
  BORROWED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  RETURNED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  OVERDUE: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

export default function LibraryModule() {
  const [tab, setTab] = useState("resources")
  const [resources, setResources] = useState<Resource[]>([])
  const [borrows, setBorrows] = useState<Borrow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  const [editing, setEditing] = useState<Resource | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [members, setMembers] = useState<MiniMember[]>([])
  const [borrowOpen, setBorrowOpen] = useState(false)
  const [borrowResource, setBorrowResource] = useState<Resource | null>(null)
  const [borrowMember, setBorrowMember] = useState("")
  const [borrowDue, setBorrowDue] = useState("")
  const [borrowSaving, setBorrowSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    const [rRes, bRes, mRes] = await Promise.all([
      fetch(`/api/library?${params}`),
      fetch("/api/library/borrows"),
      fetch("/api/members?limit=500"),
    ])
    const [rData, bData, mData] = await Promise.all([rRes.json(), bRes.json(), mRes.json()])
    setResources(rData)
    setBorrows(bData)
    setMembers(mData.map((m: MiniMember & { status: string }) => ({ id: m.id, matricule: m.matricule, firstName: m.firstName, lastName: m.lastName, faculty: m.faculty })))
    setLoading(false)
  }, [q])

  useEffect(() => { load() }, [load])

  const stats = {
    total: resources.length,
    available: resources.reduce((s, r) => s + r.available, 0),
    borrows: borrows.filter((b) => b.status !== "RETURNED").length,
    overdue: borrows.filter((b) => b.status === "OVERDUE").length,
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function openEdit(r: Resource) {
    setEditing(r)
    setForm({ title: r.title, author: r.author ?? "", category: r.category ?? "", isbn: r.isbn ?? "", totalCopies: r.totalCopies?.toString() ?? "1" })
    setFormOpen(true)
  }

  async function save() {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/library/${editing.id}` : "/api/library", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Ressource modifiée" : "Ressource ajoutée")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(r: Resource) {
    if (!confirm(`Supprimer la ressource « ${r.title} » ?`)) return
    const res = await fetch(`/api/library/${r.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Ressource supprimée"); load() }
    else toast.error("Échec de la suppression")
  }

  function openBorrow(r: Resource) {
    setBorrowResource(r)
    setBorrowMember("")
    // Default due date = today + 14 days
    const d = new Date(); d.setDate(d.getDate() + 14)
    setBorrowDue(d.toISOString().slice(0, 10))
    setBorrowOpen(true)
  }

  async function submitBorrow() {
    if (!borrowResource || !borrowMember) { toast.error("Veuillez sélectionner un membre"); return }
    setBorrowSaving(true)
    try {
      const res = await fetch(`/api/library/${borrowResource.id}/borrows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: borrowMember, dueDate: borrowDue }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Emprunt enregistré")
      setBorrowOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBorrowSaving(false)
    }
  }

  async function returnBorrow(b: Borrow) {
    const res = await fetch(`/api/library/borrows/${b.id}`, { method: "PUT" })
    if (res.ok) { toast.success("Retour enregistré"); load() }
    else {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error || "Échec du retour")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bibliothèque"
        description="Catalogue de ressources, prêts et retours"
        icon={Library}
        actions={<Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle ressource</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total ressources" value={stats.total} icon={BookOpen} />
        <StatCard title="Exemplaires disponibles" value={stats.available} icon={BookMarked} tone="success" />
        <StatCard title="Emprunts en cours" value={stats.borrows} icon={ArrowLeftRight} tone="info" />
        <StatCard title="En retard" value={stats.overdue} icon={ArrowLeftRight} tone="danger" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resources" className="gap-1"><BookOpen className="h-4 w-4" /> Ressources</TabsTrigger>
          <TabsTrigger value="borrows" className="gap-1"><ArrowLeftRight className="h-4 w-4" /> Emprunts</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="mt-4">
          <SectionCard>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Titre, auteur, ISBN…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <LoadingState rows={6} />
            ) : resources.length === 0 ? (
              <EmptyState icon={Library} title="Aucune ressource" description="Ajoutez votre première ressource." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle ressource</Button>} />
            ) : (
              <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead className="hidden md:table-cell">Auteur</TableHead>
                      <TableHead className="hidden lg:table-cell">Catégorie</TableHead>
                      <TableHead className="text-center">Dispo</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">{r.isbn ?? "—"}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{r.author ?? "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{r.category ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={r.available > 0 ? "secondary" : "outline"} className={r.available > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"}>
                            {r.available} / {r.totalCopies}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-8 gap-1" disabled={r.available <= 0} onClick={() => openBorrow(r)}>
                              <ArrowLeftRight className="h-3.5 w-3.5" /> Emprunter
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="borrows" className="mt-4">
          <SectionCard>
            {loading ? (
              <LoadingState rows={6} />
            ) : borrows.length === 0 ? (
              <EmptyState icon={ArrowLeftRight} title="Aucun emprunt" description="Les emprunts apparaîtront ici." />
            ) : (
              <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Ressource</TableHead>
                      <TableHead className="hidden md:table-cell">Emprunté le</TableHead>
                      <TableHead className="hidden md:table-cell">À rendre</TableHead>
                      <TableHead className="hidden lg:table-cell">Retourné</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrows.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <p className="font-medium">{b.member.firstName} {b.member.lastName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{b.member.matricule}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{b.resource.title}</p>
                          <p className="text-xs text-muted-foreground">{b.resource.author ?? "—"}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(b.borrowedAt)}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(b.dueDate)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(b.returnedAt)}</TableCell>
                        <TableCell><Badge variant="outline" className={BORROW_STATUS_COLORS[b.status]}>{BORROW_STATUS_LABELS[b.status] ?? b.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {b.status !== "RETURNED" ? (
                            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => returnBorrow(b)}>
                              <RotateCcw className="h-3.5 w-3.5" /> Retourner
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Resource form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la ressource" : "Nouvelle ressource"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <Field label="Auteur">
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </Field>
            <Field label="Catégorie">
              <Input placeholder="Livre, Revue, Mémoire…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="ISBN">
              <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </Field>
            <Field label="Exemplaires totaux">
              <Input type="number" min={1} value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Borrow dialog */}
      <Dialog open={borrowOpen} onOpenChange={setBorrowOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Emprunter : {borrowResource?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Membre *</Label>
              <Select value={borrowMember} onValueChange={setBorrowMember}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un membre…" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.matricule}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date de retour prévue</Label>
              <Input type="date" value={borrowDue} onChange={(e) => setBorrowDue(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Exemplaires disponibles : <span className="font-semibold">{borrowResource?.available}</span> / {borrowResource?.totalCopies}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrowOpen(false)}>Annuler</Button>
            <Button onClick={submitBorrow} disabled={borrowSaving || !borrowMember}>{borrowSaving ? "Enregistrement…" : "Confirmer l'emprunt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
