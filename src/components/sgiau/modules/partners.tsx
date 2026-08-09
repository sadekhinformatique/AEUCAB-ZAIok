"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { Handshake, Search, Plus, Pencil, Trash2, Mail, Phone, MapPin, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { formatDate } from "@/lib/sgiau/format"

interface Partner {
  id: string; name: string; type: string; contactName: string | null; contactPhone: string | null
  contactEmail: string | null; address: string | null; contractUrl: string | null
  contribution: number; startDate: string | null; endDate: string | null; note: string | null
  createdAt: string
}

const TYPES: Record<string, string> = { PARTNER: "Partenaire", SPONSOR: "Sponsor", INSTITUTION: "Institution" }
const TYPE_COLORS: Record<string, string> = {
  PARTNER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  SPONSOR: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  INSTITUTION: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
}

const emptyForm = {
  name: "", type: "PARTNER", contactName: "", contactPhone: "", contactEmail: "",
  address: "", contribution: "", startDate: "", endDate: "", note: "", contractUrl: "",
}

export default function PartnersModule() {
  const [items, setItems] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [type, setType] = useState("ALL")

  const [editing, setEditing] = useState<Partner | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<Partner | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (type !== "ALL") params.set("type", type)
    const res = await fetch(`/api/partners?${params}`)
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [q, type])

  useEffect(() => { load() }, [load])

  const stats = {
    total: items.length,
    byType: countBy(items, (p) => p.type),
    contribution: items.reduce((s, p) => s + (p.contribution ?? 0), 0),
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function openEdit(p: Partner) {
    setEditing(p)
    setForm({
      name: p.name, type: p.type,
      contactName: p.contactName ?? "", contactPhone: p.contactPhone ?? "",
      contactEmail: p.contactEmail ?? "", address: p.address ?? "",
      contractUrl: p.contractUrl ?? "", contribution: p.contribution?.toString() ?? "",
      startDate: p.startDate ? p.startDate.slice(0, 10) : "",
      endDate: p.endDate ? p.endDate.slice(0, 10) : "",
      note: p.note ?? "",
    })
    setFormOpen(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Le nom du partenaire est requis"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/partners/${editing.id}` : "/api/partners", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Partenaire modifié" : "Partenaire ajouté")
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(p: Partner) {
    if (!confirm(`Supprimer le partenaire « ${p.name} » ?`)) return
    const res = await fetch(`/api/partners/${p.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Partenaire supprimé"); load() }
    else toast.error("Échec de la suppression")
  }

  function openDetail(p: Partner) { setDetail(p); setDetailOpen(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partenaires"
        description="Partenaires, sponsors et institutions soutenant l'amicale"
        icon={Handshake}
        actions={<Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau partenaire</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total partenaires" value={stats.total} icon={Handshake} />
        <StatCard title="Sponsors & institutions" value={(stats.byType.SPONSOR ?? 0) + (stats.byType.INSTITUTION ?? 0)} icon={Handshake} tone="info" />
        <StatCard title="Contributions totales" value={<Money value={stats.contribution} />} icon={Handshake} tone="success" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom, contact, email…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les types</SelectItem>
              {Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={4} />
        ) : items.length === 0 ? (
          <EmptyState icon={Handshake} title="Aucun partenaire" description="Ajoutez un premier partenaire." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau partenaire</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(p)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      <Badge variant="outline" className={TYPE_COLORS[p.type] + " mt-1"}>{TYPES[p.type] ?? p.type}</Badge>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {p.contactName && <p className="text-muted-foreground">{p.contactName}</p>}
                    {p.contactPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{p.contactPhone}</p>}
                    {p.contactEmail && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{p.contactEmail}</p>}
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Contribution</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300"><Money value={p.contribution} /></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Période</p>
                      <p className="text-xs font-medium">{formatDate(p.startDate)} → {formatDate(p.endDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le partenaire" : "Nouveau partenaire"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Contribution (FCFA)">
              <Input type="number" min={0} value={form.contribution} onChange={(e) => setForm({ ...form, contribution: e.target.value })} />
            </Field>
            <Field label="Nom du contact">
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </Field>
            <Field label="Téléphone">
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </Field>
            <Field label="Date de début">
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="Date de fin">
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">URL du contrat</Label>
              <Input placeholder="/contracts/contrat.pdf" value={form.contractUrl} onChange={(e) => setForm({ ...form, contractUrl: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Note</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
                  <Handshake className="h-5 w-5 text-primary" />
                  {detail.name}
                </SheetTitle>
                <SheetDescription><Badge variant="outline" className={TYPE_COLORS[detail.type]}>{TYPES[detail.type] ?? detail.type}</Badge></SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Contribution" value={<Money value={detail.contribution} />} />
                  <Info label="Période" value={`${formatDate(detail.startDate)} → ${formatDate(detail.endDate)}`} />
                  <Info label="Contact" value={detail.contactName ?? "—"} />
                  <Info label="Téléphone" value={detail.contactPhone ?? "—"} />
                </div>
                {detail.contactEmail && <Info label="Email" value={detail.contactEmail} />}
                {detail.address && (
                  <div className="text-sm flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{detail.address}</span>
                  </div>
                )}
                {detail.contractUrl && (
                  <a href={detail.contractUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileText className="h-4 w-4" /> Voir le contrat
                  </a>
                )}
                {detail.note && (
                  <SectionCard title="Note">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.note}</p>
                  </SectionCard>
                )}
                <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => { setDetailOpen(false); openEdit(detail) }}>
                  <Pencil className="h-4 w-4" /> Modifier
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
function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const r: Record<string, number> = {}
  for (const x of arr) {
    const k = key(x)
    r[k] = (r[k] ?? 0) + 1
  }
  return r
}
