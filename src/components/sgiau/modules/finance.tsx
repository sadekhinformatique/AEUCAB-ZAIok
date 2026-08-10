"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import { BookOpen, TrendingUp, TrendingDown, Scale, Lock, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatCurrency, formatDate, toCSV, downloadCSV } from "@/lib/sgiau/format"

interface Account {
  id: string; code: string; name: string; type: string; parentId: string | null; isActive: boolean
  parent: { code: string; name: string } | null
}
interface LedgerEntry {
  id: string; date: string; debit: number; credit: number; label: string; refType: string | null; refId: string | null
  account: { id: string; code: string; name: string; type: string }
  fiscalYear: { id: string; name: string } | null
}
interface FiscalYear {
  id: string; name: string; startDate: string; endDate: string; closed: boolean; closedAt: string | null
}
interface BalanceRow {
  accountId: string; code: string; name: string; type: string; debit: number; credit: number; solde: number
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: "Actif",
  LIABILITY: "Passif",
  EQUITY: "Capitaux",
  REVENUE: "Produits",
  EXPENSE: "Charges",
}
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  LIABILITY: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  EQUITY: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  REVENUE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  EXPENSE: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
}

export default function FinanceModule() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [balance, setBalance] = useState<BalanceRow[]>([])
  const [currentFyId, setCurrentFyId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)

  const [fyFilter, setFyFilter] = useState<string>("ALL")
  const [accFilter, setAccFilter] = useState<string>("ALL")
  const [closing, setClosing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fyFilter && fyFilter !== "ALL") params.set("fiscalYearId", fyFilter)
      const res = await fetch(`/api/finance?${params}`)
      const data = await res.json()
      setAccounts(data.accounts || [])
      setEntries(data.ledgerEntries || [])
      setFiscalYears(data.fiscalYears || [])
      setBalance(data.balance || [])
      setCurrentFyId(data.currentFiscalYearId)
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [fyFilter])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const recettes = balance.filter((b) => b.type === "REVENUE").reduce((s, b) => s + b.solde, 0)
    const depenses = balance.filter((b) => b.type === "EXPENSE").reduce((s, b) => s + b.solde, 0)
    return { recettes, depenses, resultat: recettes - depenses, ecritures: entries.length }
  }, [balance, entries])

  // Filtered entries (by account on Journal tab)
  const filteredEntries = useMemo(() => {
    if (accFilter === "ALL") return entries
    return entries.filter((e) => e.account.id === accFilter)
  }, [entries, accFilter])

  // Build a flat list of accounts with parent indentation hint (sort by code)
  const sortedAccounts = useMemo(() => [...accounts].sort((a, b) => a.code.localeCompare(b.code)), [accounts])
  const accountDepth = useCallback((acc: Account): number => {
    let depth = 0
    let cur: Account | undefined = acc
    const seen = new Set<string>()
    while (cur?.parentId && !seen.has(cur.id)) {
      seen.add(cur.id)
      cur = accounts.find((a) => a.id === cur!.parentId)
      depth++
      if (depth > 10) break
    }
    return depth
  }, [accounts])

  async function closeFiscalYear(fy: FiscalYear) {
    if (!confirm(`Clôturer l'exercice ${fy.name} ? Cette action est définitive.`)) return
    setClosing(fy.id)
    try {
      const res = await fetch(`/api/finance/fiscal-years/${fy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(`Exercice ${fy.name} clôturé`)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setClosing(null)
    }
  }

  function exportJournal() {
    const rows = filteredEntries.map((e) => ({
      date: formatDate(e.date),
      compte: `${e.account.code} — ${e.account.name}`,
      libelle: e.label,
      debit: e.debit,
      credit: e.credit,
      exercice: e.fiscalYear?.name ?? "",
    }))
    downloadCSV(`journal-${Date.now()}.csv`, toCSV(rows))
    toast.success(`${rows.length} écritures exportées`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Comptabilité"
        description="Journal, plan comptable, balance et clôture des exercices"
        icon={BookOpen}
        actions={
          <Button variant="outline" size="sm" onClick={exportJournal} className="gap-2">
            <Download className="h-4 w-4" /> Exporter le journal
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Recettes exercice" value={<Money value={stats.recettes} />} icon={TrendingUp} tone="success" />
        <StatCard title="Dépenses exercice" value={<Money value={stats.depenses} />} icon={TrendingDown} tone="danger" />
        <StatCard title="Résultat" value={<Money value={stats.resultat} />} icon={Scale} tone={stats.resultat >= 0 ? "success" : "warning"} />
        <StatCard title="Écritures" value={stats.ecritures} icon={BookOpen} tone="info" />
      </div>

      <Tabs defaultValue="journal">
        <TabsList>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="accounts">Plan comptable</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="fiscal-years">Exercices</TabsTrigger>
        </TabsList>

        {/* Journal */}
        <TabsContent value="journal">
          <SectionCard title="Journal comptable" description={`${filteredEntries.length} écriture(s)`}>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Select value={fyFilter} onValueChange={setFyFilter}>
                <SelectTrigger className="w-full sm:w-56"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Exercice" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les exercices</SelectItem>
                  {fiscalYears.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}{f.closed ? " (clôturé)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={accFilter} onValueChange={setAccFilter}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Compte" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">Tous les comptes</SelectItem>
                  {sortedAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? <LoadingState rows={10} /> : filteredEntries.length === 0 ? (
              <EmptyState icon={BookOpen} title="Aucune écriture" description="Aucune écriture pour ces filtres." />
            ) : (
              <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead className="w-32">Compte</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right">Débit</TableHead>
                      <TableHead className="text-right">Crédit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(e.date)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          <p className="font-semibold">{e.account.code}</p>
                          <p className="text-muted-foreground">{e.account.name}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.label}
                          {e.refType && <Badge variant="outline" className="ml-2 text-[10px] bg-muted/50">{e.refType}</Badge>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{e.debit ? formatCurrency(e.debit) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{e.credit ? formatCurrency(e.credit) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot className="sticky bottom-0 bg-card border-t-2">
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold text-right">Totaux</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(filteredEntries.reduce((s, e) => s + e.debit, 0))}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(filteredEntries.reduce((s, e) => s + e.credit, 0))}</TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Plan comptable */}
        <TabsContent value="accounts">
          <SectionCard title="Plan comptable" description={`${accounts.length} compte(s)`}>
            {loading ? <LoadingState rows={8} /> : (
              <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-32">Code</TableHead>
                      <TableHead>Intitulé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAccounts.map((a) => {
                      const depth = accountDepth(a)
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs font-semibold">{a.code}</TableCell>
                          <TableCell>
                            <span style={{ paddingLeft: `${depth * 16}px` }} className="inline-block">
                              {a.name}
                              {a.parent && <span className="ml-2 text-xs text-muted-foreground">↳ {a.parent.code}</span>}
                            </span>
                          </TableCell>
                          <TableCell><Badge variant="outline" className={ACCOUNT_TYPE_COLORS[a.type]}>{ACCOUNT_TYPE_LABELS[a.type] || a.type}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={a.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-neutral-100 text-neutral-600"}>
                              {a.isActive ? "Actif" : "Inactif"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Balance */}
        <TabsContent value="balance">
          <SectionCard title="Balance comptable" description={`${balance.length} compte(s) mouvementé(s)`}>
            {loading ? <LoadingState rows={8} /> : balance.length === 0 ? (
              <EmptyState icon={Scale} title="Aucun mouvement" description="Aucune écriture pour cet exercice." />
            ) : (
              <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-32">Compte</TableHead>
                      <TableHead>Intitulé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Débit</TableHead>
                      <TableHead className="text-right">Crédit</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balance.map((b) => (
                      <TableRow key={b.accountId}>
                        <TableCell className="font-mono text-xs font-semibold">{b.code}</TableCell>
                        <TableCell className="text-sm">{b.name}</TableCell>
                        <TableCell><Badge variant="outline" className={ACCOUNT_TYPE_COLORS[b.type]}>{ACCOUNT_TYPE_LABELS[b.type] || b.type}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{b.debit ? formatCurrency(b.debit) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.credit ? formatCurrency(b.credit) : "—"}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${b.solde >= 0 ? "" : "text-rose-600"}`}>{formatCurrency(b.solde)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot className="sticky bottom-0 bg-card border-t-2">
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold text-right">Totaux</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(balance.reduce((s, b) => s + b.debit, 0))}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(balance.reduce((s, b) => s + b.credit, 0))}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Exercices */}
        <TabsContent value="fiscal-years">
          <SectionCard title="Exercices comptables" description={`${fiscalYears.length} exercice(s)`}>
            {loading ? <LoadingState rows={4} /> : fiscalYears.length === 0 ? (
              <EmptyState icon={BookOpen} title="Aucun exercice" description="Créez un exercice pour commencer." />
            ) : (
              <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Exercice</TableHead>
                      <TableHead className="hidden md:table-cell">Début</TableHead>
                      <TableHead className="hidden md:table-cell">Fin</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fiscalYears.map((f) => (
                      <TableRow key={f.id} className={currentFyId === f.id ? "bg-primary/5" : ""}>
                        <TableCell className="font-semibold">{f.name}{currentFyId === f.id && <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">Courant</Badge>}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(f.startDate)}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(f.endDate)}</TableCell>
                        <TableCell>
                          {f.closed ? (
                            <Badge variant="outline" className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">Clôturé{f.closedAt ? ` · ${formatDate(f.closedAt)}` : ""}</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Ouvert</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!f.closed && (
                            <Button size="sm" variant="outline" className="gap-2" disabled={closing === f.id} onClick={() => closeFiscalYear(f)}>
                              <Lock className="h-4 w-4" /> {closing === f.id ? "Clôture…" : "Clôturer"}
                            </Button>
                          )}
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
    </div>
  )
}
