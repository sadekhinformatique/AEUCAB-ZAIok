"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { Search, Users, Wallet, TrendingDown, FileText, CalendarDays, UsersRound, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate, formatDateTime, initials } from "@/lib/sgiau/format"
import { MEMBER_STATUS_COLORS, MEMBER_STATUS_LABELS, PAYMENT_MODE_LABELS, EXPENSE_STATUS_LABELS, ACTIVITY_STATUS_LABELS } from "@/lib/sgiau/constants"
import { useSgiau } from "@/lib/sgiau/store"

interface Results {
  members: { id: string; matricule: string; name: string; faculty: string | null; level: string | null; status: string; email: string | null }[]
  payments: { id: string; reference: string; amount: number; mode: string; status: string; date: string; member: string; matricule: string; cotisation: string | null }[]
  expenses: { id: string; reference: string; label: string; amount: number; status: string; date: string; category: string | null }[]
  documents: { id: string; title: string; category: string; visibility: string; createdAt: string; signedBy: string | null }[]
  activities: { id: string; name: string; type: string; status: string; startDate: string; location: string | null }[]
  meetings: { id: string; title: string; status: string; startDate: string; location: string | null }[]
}

const ENTITY_CONFIG: { key: keyof Results; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "members", label: "Membres", icon: Users },
  { key: "payments", label: "Paiements", icon: Wallet },
  { key: "expenses", label: "Dépenses", icon: TrendingDown },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "activities", label: "Activités", icon: CalendarDays },
  { key: "meetings", label: "Réunions", icon: UsersRound },
]

const empty: Results = { members: [], payments: [], expenses: [], documents: [], activities: [], meetings: [] }

export default function SearchModule() {
  const { searchQuery, setModule, setSearch } = useSgiau()
  const [q, setQ] = useState(searchQuery || "")
  const [results, setResults] = useState<Results>(empty)
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState<Record<keyof Results, boolean>>({
    members: true, payments: true, expenses: true, documents: true, activities: true, meetings: true,
  })
  const [expanded, setExpanded] = useState<Record<keyof Results, boolean>>({
    members: false, payments: false, expenses: false, documents: false, activities: false, meetings: false,
  })

  const runSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults(empty)
      setLoading(false)
      return
    }
    setLoading(true)
    const entities = ENTITY_CONFIG.filter((e) => enabled[e.key]).map((e) => e.key).join(",")
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&entities=${entities}`)
      const data = await res.json()
      setResults(data || empty)
    } catch {
      setResults(empty)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (searchQuery) {
      setQ(searchQuery)
      runSearch(searchQuery)
      setSearch("")
    } else if (q) {
      runSearch(q)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => runSearch(q), 350)
    return () => clearTimeout(t)
  }, [q, runSearch])

  function toggleEntity(key: keyof Results) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const total = ENTITY_CONFIG.reduce((s, e) => s + results[e.key].length, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recherche globale"
        description="Recherchez simultanément dans les membres, paiements, dépenses, documents, activités et réunions"
        icon={Search}
      />

      <SectionCard>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Saisissez votre recherche (au moins 2 caractères)…"
            className="pl-12 h-12 text-base"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(q) }}
          />
        </div>

        <div className="flex flex-wrap gap-4 mt-4">
          {ENTITY_CONFIG.map((e) => (
            <label key={e.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={enabled[e.key]} onCheckedChange={() => toggleEntity(e.key)} />
              <Label className="text-sm cursor-pointer">{e.label}</Label>
            </label>
          ))}
        </div>
      </SectionCard>

      {loading ? (
        <LoadingState rows={4} />
      ) : !q || q.length < 2 ? (
        <EmptyState icon={Search} title="Lancez une recherche" description="Saisissez au moins 2 caractères pour explorer toute la base." />
      ) : total === 0 ? (
        <EmptyState icon={Search} title="Aucun résultat" description={`Aucune correspondance pour « ${q} ».`} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ENTITY_CONFIG.map(({ key, label, icon: Icon }) => {
            const items = results[key]
            if (!enabled[key] || items.length === 0) return null
            const isExpanded = expanded[key]
            const visible = isExpanded ? items : items.slice(0, 5)
            return (
              <SectionCard
                key={key}
                title={`${label} (${items.length})`}
                actions={
                  items.length > 5 && (
                    <button
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))}
                    >
                      {isExpanded ? <>Réduire <ChevronUp className="h-3 w-3" /></> : <>Voir plus <ChevronDown className="h-3 w-3" /></>}
                    </button>
                  )
                }
              >
                <div className="space-y-1 max-h-80 overflow-y-auto scroll-thin">
                  {visible.map((item: any) => (
                    <ResultRow key={item.id} entityKey={key} item={item} icon={Icon} onMemberClick={() => setModule("members")} />
                  ))}
                </div>
              </SectionCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ResultRow({ entityKey, item, icon: Icon, onMemberClick }: { entityKey: keyof Results; item: any; icon: React.ComponentType<{ className?: string }>; onMemberClick: () => void }) {
  if (entityKey === "members") {
    return (
      <button onClick={onMemberClick} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left">
        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(item.name.split(" ")[0], item.name.split(" ")[1])}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.matricule} · {item.faculty ?? "—"} · {item.level ?? "—"}</p>
        </div>
        <Badge variant="outline" className={MEMBER_STATUS_COLORS[item.status]}>{MEMBER_STATUS_LABELS[item.status]}</Badge>
      </button>
    )
  }
  if (entityKey === "payments") {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.member} · {item.cotisation ?? "Cotisation"}</p>
            <p className="text-xs text-muted-foreground">{item.reference} · {formatDate(item.date)} · {PAYMENT_MODE_LABELS[item.mode] ?? item.mode}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold"><Money value={item.amount} /></p>
          <p className="text-[11px] text-muted-foreground">{item.status}</p>
        </div>
      </div>
    )
  }
  if (entityKey === "expenses") {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.reference} · {item.category ?? "—"} · {formatDate(item.date)}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold"><Money value={item.amount} /></p>
          <Badge variant="outline" className="text-[10px]">{EXPENSE_STATUS_LABELS[item.status] ?? item.status}</Badge>
        </div>
      </div>
    )
  }
  if (entityKey === "documents") {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.category} · {formatDate(item.createdAt)}{item.signedBy ? ` · Signé: ${item.signedBy}` : ""}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">{item.visibility}</Badge>
      </div>
    )
  }
  if (entityKey === "activities") {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.type} · {formatDateTime(item.startDate)}{item.location ? ` · ${item.location}` : ""}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">{ACTIVITY_STATUS_LABELS[item.status] ?? item.status}</Badge>
      </div>
    )
  }
  // meetings
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(item.startDate)}{item.location ? ` · ${item.location}` : ""}</p>
        </div>
      </div>
      <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
    </div>
  )
}
