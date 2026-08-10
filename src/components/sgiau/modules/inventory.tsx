"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { Boxes, Search, Filter, Plus, Pencil, Trash2, Wrench, MapPin } from "lucide-react"
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
import { formatDate } from "@/lib/sgiau/format"

interface Item {
  id: string; inventoryNo: string; name: string; category: string | null
  purchasePrice: number; currentValue: number; condition: string; location: string | null
  responsibleId: string | null; purchaseDate: string | null; maintenanceNote: string | null
  createdAt: string; updatedAt: string
}

const CONDITIONS: Record<string, string> = { NEW: "Neuf", GOOD: "Bon", DAMAGED: "Endommagé", BROKEN: "Hors service" }
const CONDITION_COLORS: Record<string, string> = {
  NEW: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  GOOD: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  DAMAGED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  BROKEN: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

const emptyForm = {
  name: "", category: "", purchasePrice: "", currentValue: "", condition: "GOOD",
  location: "", purchaseDate: "", maintenanceNote: "",
}

export default function InventoryModule() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("ALL")
  const [condition, setCondition] = useState("ALL")

  const [editing, setEditing] = useState<Item | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<Item | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [noteEdit, setNoteEdit] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (category !== "ALL") params.set("category", category)
    if (condition !== "ALL") params.set("condition", condition)
    const res = await fetch(`/api/inventory?${params}`)
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [q, category, condition])

  useEffect(() => { load() }, [load])

  const stats = {
    total: items.length,
    value: items.reduce((s, i) => s + (i.currentValue || 0), 0),
    byCondition: countBy(items, (i) => i.condition),
    categories: new Set(items.map((i) => i.category).filter(Boolean)).size,
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function openEdit(i: Item) {
    setEditing(i)
    setForm({
      name: i.name,
      category: i.category ?? "",
      purchasePrice: i.purchasePrice?.toString() ?? "",
      currentValue: i.currentValue?.toString() ?? "",
      condition: i.condition,
      location: i.location ?? "",
      purchaseDate: i.purchaseDate ? i.purchaseDate.slice(0, 10) : "",
      maintenanceNote: i.maintenanceNote ?? "",
    })
    setFormOpen(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Le nom du bien est requis"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/inventory/${editing.id}` : "/api/inventory", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Bien modifié" : "Bien ajouté")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(i: Item) {
    if (!confirm(`Supprimer le bien « ${i.name} » (${i.inventoryNo}) ?`)) return
    const res = await fetch(`/api/inventory/${i.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Bien supprimé"); load() }
    else toast.error("Échec de la suppression")
  }

  async function openDetail(i: Item) {
    setDetail(i)
    setNoteEdit(i.maintenanceNote ?? "")
    setDetailOpen(true)
  }

  async function saveNote() {
    if (!detail) return
    setNoteSaving(true)
    try {
      const res = await fetch(`/api/inventory/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceNote: noteEdit }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      setDetail(data)
      toast.success("Note de maintenance enregistrée")
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setNoteSaving(false)
    }
  }

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaire"
        description="Patrimoine de l'amicale : biens, état, valeur et maintenance"
        icon={Boxes}
        actions={<Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau bien</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total biens" value={stats.total} icon={Boxes} />
        <StatCard title="Valeur totale" value={<Money value={stats.value} />} icon={Boxes} tone="success" />
        <StatCard title="En bon état" value={(stats.byCondition.NEW ?? 0) + (stats.byCondition.GOOD ?? 0)} icon={Boxes} tone="info" />
        <StatCard title="Endommagés / HS" value={(stats.byCondition.DAMAGED ?? 0) + (stats.byCondition.BROKEN ?? 0)} icon={Boxes} tone="warning" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom, n° inventaire, emplacement…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes catégories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="État" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les états</SelectItem>
              {Object.entries(CONDITIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={8} />
        ) : items.length === 0 ? (
          <EmptyState icon={Boxes} title="Aucun bien enregistré" description="Ajoutez votre premier bien à l'inventaire." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau bien</Button>} />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                  <TableHead className="text-right">Valeur</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="hidden lg:table-cell">Emplacement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => openDetail(i)}>
                    <TableCell className="font-mono text-xs">{i.inventoryNo}</TableCell>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{i.category ?? "—"}</TableCell>
                    <TableCell className="text-right"><Money value={i.currentValue} /></TableCell>
                    <TableCell><Badge variant="outline" className={CONDITION_COLORS[i.condition]}>{CONDITIONS[i.condition] ?? i.condition}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{i.location ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editing ? "Modifier le bien" : "Nouveau bien"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Désignation *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <Field label="Catégorie">
              <Input placeholder="Mobilier, Informatique,…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="État">
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CONDITIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Prix d'achat (FCFA)">
              <Input type="number" min={0} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
            </Field>
            <Field label="Valeur actuelle (FCFA)">
              <Input type="number" min={0} value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} />
            </Field>
            <Field label="Emplacement">
              <Input placeholder="Bureau, Magasin, Salle…" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Date d'achat">
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Note de maintenance</Label>
              <Textarea rows={2} value={form.maintenanceNote} onChange={(e) => setForm({ ...form, maintenanceNote: e.target.value })} />
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
          {!detail ? (
            <div className="p-6"><LoadingState rows={4} /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  {detail.name}
                </SheetTitle>
                <SheetDescription className="font-mono">{detail.inventoryNo}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={CONDITION_COLORS[detail.condition]}>{CONDITIONS[detail.condition] ?? detail.condition}</Badge>
                  {detail.category && <Badge variant="outline">{detail.category}</Badge>}
                  {detail.location && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{detail.location}</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Prix d'achat" value={detail.purchasePrice != null ? detail.purchasePrice.toLocaleString("fr-FR") + " FCFA" : "—"} />
                  <Info label="Valeur actuelle" value={detail.currentValue != null ? detail.currentValue.toLocaleString("fr-FR") + " FCFA" : "—"} />
                  <Info label="Date d'achat" value={formatDate(detail.purchaseDate)} />
                  <Info label="Catégorie" value={detail.category ?? "—"} />
                </div>

                <SectionCard title="Note de maintenance" actions={<Wrench className="h-4 w-4 text-muted-foreground" />}>
                  <Textarea rows={4} value={noteEdit} onChange={(e) => setNoteEdit(e.target.value)} placeholder="Dernière révision, prochaine maintenance, observations…" />
                  <Button size="sm" className="mt-2" onClick={saveNote} disabled={noteSaving}>{noteSaving ? "Enregistrement…" : "Enregistrer la note"}</Button>
                </SectionCard>

                <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => { setDetailOpen(false); openEdit(detail) }}>
                  <Pencil className="h-4 w-4" /> Modifier le bien
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
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
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
