"use client"

import { useEffect, useState } from "react"
import { PageHeader, SectionCard, Money, LoadingState } from "@/components/sgiau/ui"
import { BarChart3, TrendingUp, TrendingDown, Wallet, Award } from "lucide-react"
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts"

interface StatsData {
  months: { label: string; revenue: number; spend: number }[]
  byFaculty: { name: string; value: number }[]
  byLevel: { name: string; value: number }[]
  bySex: { name: string; value: number }[]
  topCotisants: { name: string; matricule: string; value: number }[]
  recovery: { paid: number; due: number; remaining: number; rate: number }
  expensesByCategory: { name: string; value: number }[]
  totals: { revenue: number; spend: number; payments: number; expenses: number }
}

const PIE_COLORS = [
  "oklch(0.55 0.13 160)", "oklch(0.6 0.13 200)", "oklch(0.7 0.15 70)",
  "oklch(0.62 0.2 25)", "oklch(0.6 0.16 300)", "oklch(0.65 0.13 145)",
  "oklch(0.55 0.13 240)", "oklch(0.7 0.18 130)",
]

export default function StatisticsModule() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/statistics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Statistiques & analyses" description="Analyses croisées sur les membres, finances et activités" icon={BarChart3} />
        <LoadingState rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques & analyses"
        description="Analyses croisées sur les membres, finances et activités"
        icon={BarChart3}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Recettes totales" value={<Money value={data.totals.revenue} />} icon={TrendingUp} tone="success" />
        <Card label="Dépenses validées" value={<Money value={data.totals.spend} />} icon={TrendingDown} tone="danger" />
        <Card label="Paiements" value={data.totals.payments} icon={Wallet} tone="info" />
        <Card label="Taux de recouvrement" value={`${data.recovery.rate}%`} icon={Award} tone="default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Évolution mensuelle — recettes vs dépenses" description="12 derniers mois" contentClassName="pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.55 0.13 160)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="oklch(0.55 0.13 160)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.62 0.2 25)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="oklch(0.62 0.2 25)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 155)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" name="Recettes" stroke="oklch(0.55 0.13 160)" strokeWidth={2} fill="url(#r)" />
              <Area type="monotone" dataKey="spend" name="Dépenses" stroke="oklch(0.62 0.2 25)" strokeWidth={2} fill="url(#s)" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Taux de recouvrement cotisations" description="Montant payé vs montant dû" contentClassName="pt-4">
          <div className="flex flex-col items-center justify-center h-[300px]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Payé", value: data.recovery.paid },
                    { name: "Reste à recouvrer", value: data.recovery.remaining },
                  ]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  <Cell fill="oklch(0.55 0.13 160)" />
                  <Cell fill="oklch(0.85 0.05 60)" />
                </Pie>
                <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} contentStyle={{ borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center -mt-2">
              <p className="text-3xl font-bold tabular-nums">{data.recovery.rate}%</p>
              <p className="text-xs text-muted-foreground">
                <Money value={data.recovery.paid} /> sur <Money value={data.recovery.due} />
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Répartition par filière" description="Membres" contentClassName="pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.byFaculty} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2}>
                {data.byFaculty.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Répartition par sexe" description="Membres" contentClassName="pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.bySex} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2}>
                {data.bySex.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Répartition par niveau" description="Membres" contentClassName="pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byLevel} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="value" name="Membres" fill="oklch(0.55 0.13 160)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top 5 cotisants" description="Membres ayant le plus payé" contentClassName="pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topCotisants} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 160)" width={120} />
              <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="value" name="Montant payé" fill="oklch(0.6 0.16 300)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Répartition dépenses par catégorie" description="Dépenses validées" className="lg:col-span-2" contentClassName="pt-4">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={data.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={(e: { name?: string; value?: number }) => `${e.name ?? ""}`}>
                {data.expensesByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} contentStyle={{ borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  )
}

function Card({ label, value, icon: Icon, tone }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; tone: "success" | "danger" | "info" | "default" }) {
  const tones: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    info: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    default: "bg-primary/10 text-primary",
  }
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="text-2xl font-bold tracking-tight mt-2">{value}</p>
    </div>
  )
}
