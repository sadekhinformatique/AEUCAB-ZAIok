"use client"

import { useEffect, useState } from "react"
import { PageHeader, StatCard, SectionCard, Money, LoadingState } from "@/components/sgiau/ui"
import {
  LayoutDashboard, Users, UserCheck, Wallet, TrendingDown, Landmark,
  ReceiptText, CalendarDays, Vote, AlertTriangle, ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts"
import { useSgiau } from "@/lib/sgiau/store"
import { MEMBER_STATUS_COLORS, MEMBER_STATUS_LABELS, PAYMENT_MODE_LABELS } from "@/lib/sgiau/constants"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/sgiau/format"

interface DashData {
  counts: Record<string, number>
  financials: { revenue: number; spend: number; balance: number; cashBalance: number }
  months: { label: string; revenue: number; spend: number }[]
  byFaculty: { name: string; value: number }[]
  byMode: { name: string; value: number }[]
  recentPayments: { id: string; reference: string; amount: number; mode: string; status: string; date: string; member: string; matricule: string }[]
  recentMembers: { id: string; matricule: string; name: string; faculty: string | null; status: string; createdAt: string }[]
}

const PIE_COLORS = ["oklch(0.55 0.13 160)", "oklch(0.6 0.13 200)", "oklch(0.7 0.15 70)", "oklch(0.62 0.2 25)", "oklch(0.6 0.16 300)", "oklch(0.65 0.13 145)"]

export default function DashboardModule() {
  const { setModule } = useSgiau()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'amicale universitaire en temps réel"
        icon={LayoutDashboard}
      />

      {loading || !data ? (
        <LoadingState rows={6} />
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Membres actifs" value={data.counts.activeMembers} icon={UserCheck} tone="success"
              hint={`${data.counts.totalMembers} membres au total`} loading={loading}
              onClick={() => setModule("members")} />
            <StatCard title="Adhésions en attente" value={data.counts.pendingMembers} icon={Users} tone="info"
              hint="À valider par le secrétaire" loading={loading} />
            <StatCard title="Recettes (exercice)" value={<Money value={data.financials.revenue} />} icon={Wallet} tone="success"
              hint={`${data.counts.totalPayments} paiements encaissés`} loading={loading} />
            <StatCard title="Dépenses validées" value={<Money value={data.financials.spend} />} icon={TrendingDown} tone="danger"
              hint={`${data.counts.pendingExpenses} en attente de validation`} loading={loading} />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Solde de trésorerie" value={<Money value={data.financials.cashBalance} />} icon={Landmark} tone="default" loading={loading} />
            <StatCard title="Reçus émis" value={data.counts.totalReceipts} icon={ReceiptText} tone="default" loading={loading} />
            <StatCard title="Activités" value={data.counts.activities} icon={CalendarDays} tone="default" loading={loading} />
            <StatCard title="Élections / Votes ouverts" value={`${data.counts.openElections} / ${data.counts.openVotes}`} icon={Vote} tone="info" loading={loading} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Évolution financière" description="8 derniers mois" className="lg:col-span-2" contentClassName="pt-4">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.55 0.13 160)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="oklch(0.55 0.13 160)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.62 0.2 25)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="oklch(0.62 0.2 25)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="oklch(0.6 0.02 160)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 155)" }} />
                  <Area type="monotone" dataKey="revenue" name="Recettes" stroke="oklch(0.55 0.13 160)" strokeWidth={2} fill="url(#gRev)" />
                  <Area type="monotone" dataKey="spend" name="Dépenses" stroke="oklch(0.62 0.2 25)" strokeWidth={2} fill="url(#gSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Membres par filière" description="Répartition">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.byFaculty} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                    {data.byFaculty.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* Lower row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Paiements récents" description="Derniers encaissements" actions={
              <button onClick={() => setModule("cotisations")} className="text-xs text-primary hover:underline">Voir tout</button>
            }>
              <div className="space-y-2">
                {data.recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.member}</p>
                      <p className="text-xs text-muted-foreground">{p.reference} · {PAYMENT_MODE_LABELS[p.mode] ?? p.mode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold"><Money value={p.amount} /></p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(p.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Nouveaux membres" description="Dernières inscriptions" actions={
              <button onClick={() => setModule("members")} className="text-xs text-primary hover:underline">Voir tout</button>
            }>
              <div className="space-y-2">
                {data.recentMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.matricule} · {m.faculty ?? "—"}</p>
                    </div>
                    <Badge variant="outline" className={MEMBER_STATUS_COLORS[m.status]}>{MEMBER_STATUS_LABELS[m.status]}</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Modes de paiement" description="Répartition des encaissements">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.byMode.map((b) => ({ name: PAYMENT_MODE_LABELS[b.name] ?? b.name, value: b.value }))} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" width={90} />
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Bar dataKey="value" name="Paiements" fill="oklch(0.55 0.13 160)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* Alerts */}
          {(data.counts.pendingExpenses > 0 || data.counts.partialPayments > 0 || data.counts.pendingMembers > 0) && (
            <SectionCard title="Alertes & actions requises">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.counts.pendingExpenses > 0 && (
                  <button onClick={() => setModule("expenses")} className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors">
                    <ArrowUpRight className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{data.counts.pendingExpenses} dépense(s) à valider</p>
                      <p className="text-xs text-muted-foreground">Module Dépenses</p>
                    </div>
                  </button>
                )}
                {data.counts.partialPayments > 0 && (
                  <button onClick={() => setModule("cotisations")} className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors">
                    <ArrowDownRight className="h-5 w-5 text-rose-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{data.counts.partialPayments} paiement(s) partiel(s)</p>
                      <p className="text-xs text-muted-foreground">Relances cotisations</p>
                    </div>
                  </button>
                )}
                {data.counts.pendingMembers > 0 && (
                  <button onClick={() => setModule("adhesion")} className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors">
                    <Users className="h-5 w-5 text-cyan-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{data.counts.pendingMembers} adhésion(s) à traiter</p>
                      <p className="text-xs text-muted-foreground">Workflow d'adhésion</p>
                    </div>
                  </button>
                )}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
