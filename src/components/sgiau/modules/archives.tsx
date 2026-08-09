"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { Archive as ArchiveIcon, Search, Plus, Pencil, Trash2, Lock, LockOpen, FileText, Image, Video } from "lucide-react"
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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { formatDate } from "@/lib/sgiau/format"

interface Archive {
  id: string; title: string; year: string; category: string; fileUrl: string | null
  description: string | null; protected: boolean; createdAt: string
}

const CATEGORIES: Record<string, string> = { DOCUMENT: "Document", PHOTO: "Photo", VIDEO: "Vidéo" }
const CATEGORY_ICONS: Record<string, typeof FileText> = { DOCUMENT: FileText, PHOTO: Image, VIDEO: Video }
const CATEGORY_COLORS: Record<string, string> = {
  DOCUMENT: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
  PHOTO: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  VIDEO: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
}

const emptyForm = {
  title: "", year: String(new Date().getFullYear()), category: "DOCUMENT",
  description: "", fileUrl: "", protected: false,
}

export default function ArchivesModule() {
  const [items, setItems] = useState<Archive[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [year, setYear] = useState("ALL")
  const [category, setCategory] = useState("ALL")

  const [editing, setEditing] = useState<Archive | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<Archive | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (year !== "ALL") params.set("year", year)
    if (category !== "ALL") params.set("category", category)
    const res = await fetch(`/api/archives?${params}`)
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [q, year, category])

  useEffect(() => { load() }, [load])

  const stats = {
    total: items.length,
    years: new Set(items.map((i) => i.year)).size,
    byCategory: countBy(items, (i) => i.category),
    protectedCount: items.filter((i) => i.protected).length,
  }

  const years = Array.from(new Set(items.map((i) => i.year))).sort((a, b) => Number(b) - Number(a))

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function openEdit(a: Archive) {
    setEditing(a)
    setForm({
      title: a.title, year: a.year, category: a.category,
      description: a.description ?? "", fileUrl: a.fileUrl ?? "", protected: a.protected,
    })
    setFormOpen(true)
  }

  async function save() {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return }
    if (!form.year) { toast.error("L'année est requise"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/archives/${editing.id}` : "/api/archives", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Archive modifiée" : "Archive créée")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(a: Archive) {
    if (a.protected) {
      toast.error("Cette archive est protégée. Déprotégez-la avant de la supprimer.")
      return
    }
    if (!confirm(`Supprimer l'archive « ${a.title} » ?`)) return
    const res = await fetch(`/api/archives/${a.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Archive supprimée"); load() }
    else {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error || "Échec de la suppression")
    }
  }

  function openDetail(a: Archive) { setDetail(a); setDetailOpen(true) }

  async function toggleProtect() {
    if (!detail) return
    const res = await fetch(`/api/archives/${detail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protected: !detail.protected }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data?.error || "Échec"); return }
    setDetail(data)
    toast.success(detail.protected ? "Archive déprotégée" : "Archive protégée")
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archives"
        description="Documents historiques, photos et vidéos de l'amicale"
        icon={ArchiveIcon}
        actions={<Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle archive</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total archives" value={stats.total} icon={ArchiveIcon} />
        <StatCard title="Années distinctes" value={stats.years} icon={ArchiveIcon} tone="info" />
        <StatCard title="Documents" value={stats.byCategory.DOCUMENT ?? 0} icon={FileText} />
        <StatCard title="Protégées" value={stats.protectedCount} icon={Lock} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Titre, description…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les années</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes catégories</SelectItem>
              {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : items.length === 0 ? (
          <EmptyState icon={ArchiveIcon} title="Aucune archive" description="Ajoutez votre première archive." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle archive</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => {
                  const Icon = CATEGORY_ICONS[a.category] ?? FileText
                  return (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => openDetail(a)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{a.title}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{a.year}</TableCell>
                      <TableCell><Badge variant="outline" className={CATEGORY_COLORS[a.category]}>{CATEGORIES[a.category] ?? a.category}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[260px]">{a.description ?? "—"}</TableCell>
                      <TableCell>
                        {a.protected ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 gap-1"><Lock className="h-3 w-3" /> Protégée</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(a)} disabled={a.protected}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'archive" : "Nouvelle archive"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Année *">
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </Field>
              <Field label="Catégorie">
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">URL du fichier</Label>
              <Input placeholder="/uploads/archives/2024.pdf" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">Archive protégée</p>
                  <p className="text-xs text-muted-foreground">Empêche la suppression accidentelle</p>
                </div>
              </div>
              <Switch checked={form.protected} onCheckedChange={(v) => setForm({ ...form, protected: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Sheet open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetail(null) }}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto scroll-thin">
          {!detail ? (
            <div className="p-6"><LoadingState rows={4} /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {detail.protected ? <Lock className="h-5 w-5 text-amber-600" /> : <ArchiveIcon className="h-5 w-5 text-primary" />}
                  {detail.title}
                </SheetTitle>
                <SheetDescription>Année {detail.year}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={CATEGORY_COLORS[detail.category]}>{CATEGORIES[detail.category] ?? detail.category}</Badge>
                  {detail.protected && <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 gap-1"><Lock className="h-3 w-3" /> Protégée</Badge>}
                </div>

                {detail.description && (
                  <SectionCard title="Description">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.description}</p>
                  </SectionCard>
                )}

                {detail.fileUrl && (
                  <a href={detail.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileText className="h-4 w-4" /> Voir le fichier
                  </a>
                )}

                <div className="text-xs text-muted-foreground">Archivé le {formatDate(detail.createdAt)}</div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => { setDetailOpen(false); openEdit(detail) }}>
                    <Pencil className="h-4 w-4" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={toggleProtect}>
                    {detail.protected ? <><LockOpen className="h-4 w-4" /> Déprotéger</> : <><Lock className="h-4 w-4" /> Protéger</>}
                  </Button>
                </div>
                {!detail.protected && (
                  <Button variant="outline" size="sm" className="gap-2 w-full text-destructive hover:bg-destructive/10" onClick={() => remove(detail)}>
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </Button>
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
function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const r: Record<string, number> = {}
  for (const x of arr) {
    const k = key(x)
    r[k] = (r[k] ?? 0) + 1
  }
  return r
}
