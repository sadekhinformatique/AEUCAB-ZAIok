"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { FileText, FolderArchive, Search, Filter, Plus, Pencil, Trash2, PenLine, Printer, Eye, Lock } from "lucide-react"
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
import { toast } from "sonner"
import { formatDate, formatDateTime } from "@/lib/sgiau/format"

interface Doc {
  id: string; title: string; description: string | null; category: string; visibility: string
  fileUrl: string | null; fileType: string | null; fileSize: number | null
  signedBy: string | null; signedAt: string | null; signatureHash: string | null
  tags: string | null; createdAt: string; updatedAt: string
}

const CATEGORIES: Record<string, string> = {
  GENERAL: "Général", FINANCE: "Finance", LEGAL: "Juridique", REPORT: "Rapport", OTHER: "Autre",
}
const CATEGORY_COLORS: Record<string, string> = {
  GENERAL: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
  FINANCE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  LEGAL: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  REPORT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  OTHER: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
}
const VISIBILITY: Record<string, string> = { STAFF: "Bureau", MEMBERS: "Membres", PUBLIC: "Public" }
const VIS_COLORS: Record<string, string> = {
  STAFF: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  MEMBERS: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  PUBLIC: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
}

const emptyForm = {
  title: "", description: "", category: "GENERAL", visibility: "STAFF", tags: "", fileUrl: "",
}

export default function DocumentsModule() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("ALL")
  const [visibility, setVisibility] = useState("ALL")

  const [editing, setEditing] = useState<Doc | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<Doc | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [signing, setSigning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (category !== "ALL") params.set("category", category)
    if (visibility !== "ALL") params.set("visibility", visibility)
    const res = await fetch(`/api/documents?${params}`)
    const data = await res.json()
    setDocs(data)
    setLoading(false)
  }, [q, category, visibility])

  useEffect(() => { load() }, [load])

  const stats = {
    total: docs.length,
    signed: docs.filter((d) => !!d.signedBy).length,
    byCategory: countBy(docs, (d) => d.category),
    byVisibility: countBy(docs, (d) => d.visibility),
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }
  function openEdit(d: Doc) {
    setEditing(d)
    const tags = d.tags ? safeParse(d.tags).join(", ") : ""
    setForm({ title: d.title, description: d.description ?? "", category: d.category, visibility: d.visibility, tags, fileUrl: d.fileUrl ?? "" })
    setFormOpen(true)
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("Le titre est requis")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/documents/${editing.id}` : "/api/documents", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Document modifié" : "Document créé")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(d: Doc) {
    if (!confirm(`Supprimer le document « ${d.title} » ?`)) return
    const res = await fetch(`/api/documents/${d.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Document supprimé"); load() }
    else toast.error("Échec de la suppression")
  }

  function openDetail(d: Doc) {
    setDetail(d)
    setDetailOpen(true)
  }

  async function signDoc() {
    if (!detail) return
    setSigning(true)
    try {
      const res = await fetch(`/api/documents/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      setDetail(data)
      toast.success("Document signé électroniquement")
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Bibliothèque documentaire, classification et signature électronique"
        icon={FolderArchive}
        actions={<Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau document</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total documents" value={stats.total} icon={FileText} />
        <StatCard title="Signés" value={stats.signed} icon={PenLine} tone="success" />
        <StatCard title="Catégories" value={Object.keys(stats.byCategory).length} icon={FolderArchive} tone="info" />
        <StatCard title="Publics" value={stats.byVisibility.PUBLIC ?? 0} icon={Eye} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Titre, description, signataire…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes catégories</SelectItem>
              {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes visibilités</SelectItem>
              {Object.entries(VISIBILITY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={8} />
        ) : docs.length === 0 ? (
          <EmptyState icon={FolderArchive} title="Aucun document" description="Ajoutez un premier document." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau document</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Signataire</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => openDetail(d)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {d.signedBy ? <Lock className="h-3.5 w-3.5 text-emerald-600" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                        <div>
                          <p className="font-medium">{d.title}</p>
                          {d.description && <p className="text-xs text-muted-foreground truncate max-w-[260px]">{d.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={CATEGORY_COLORS[d.category]}>{CATEGORIES[d.category] ?? d.category}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={VIS_COLORS[d.visibility]}>{VISIBILITY[d.visibility] ?? d.visibility}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{d.fileType ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {d.signedBy ? (
                        <div>
                          <p className="font-medium">{d.signedBy}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(d.signedAt)}</p>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editing ? "Modifier le document" : "Nouveau document"}</DialogTitle>
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
            <Field label="Catégorie">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Visibilité">
              <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(VISIBILITY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Étiquettes (séparées par des virgules)</Label>
              <Input placeholder="rapport, annuel, comité…" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">URL du fichier (optionnel)</Label>
              <Input placeholder="/uploads/doc.pdf" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
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
                  <FileText className="h-5 w-5 text-primary" />
                  {detail.title}
                </SheetTitle>
                <SheetDescription>{detail.description ?? "Aucune description"}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={CATEGORY_COLORS[detail.category]}>{CATEGORIES[detail.category] ?? detail.category}</Badge>
                  <Badge variant="outline" className={VIS_COLORS[detail.visibility]}>Visibilité : {VISIBILITY[detail.visibility] ?? detail.visibility}</Badge>
                  {detail.signedBy && <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Signé</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Type de fichier" value={detail.fileType ?? "—"} />
                  <Info label="Taille" value={detail.fileSize ? `${(detail.fileSize / 1024).toFixed(1)} Ko` : "—"} />
                  <Info label="Créé le" value={formatDateTime(detail.createdAt)} />
                  <Info label="Modifié le" value={formatDateTime(detail.updatedAt)} />
                </div>

                {detail.fileUrl && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Fichier</p>
                    <a href={detail.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{detail.fileUrl}</a>
                  </div>
                )}

                {safeParse(detail.tags).length > 0 && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Étiquettes</p>
                    <div className="flex flex-wrap gap-1">
                      {safeParse(detail.tags).map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                    </div>
                  </div>
                )}

                <SectionCard title="Signature électronique">
                  {detail.signedBy ? (
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Signataire :</span> <span className="font-medium">{detail.signedBy}</span></p>
                      <p><span className="text-muted-foreground">Date :</span> {formatDateTime(detail.signedAt)}</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">Hash : {detail.signatureHash ?? "—"}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Document non signé.
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="gap-2 mt-3 w-full" onClick={signDoc} disabled={signing}>
                    <PenLine className="h-4 w-4" /> {signing ? "Signature…" : detail.signedBy ? "Re-signer" : "Signer électroniquement"}
                  </Button>
                </SectionCard>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => { setDetailOpen(false); openEdit(detail) }}>
                    <Pencil className="h-4 w-4" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" /> Imprimer
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
      <p className="font-medium break-all">{value}</p>
    </div>
  )
}
function safeParse(tags: string | null): string[] {
  if (!tags) return []
  try {
    const v = JSON.parse(tags)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}
function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const r: Record<string, number> = {}
  for (const x of arr) {
    const k = key(x)
    r[k] = (r[k] ?? 0) + 1
  }
  return r
}
