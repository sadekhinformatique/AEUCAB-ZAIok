"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { ArrowUpDown, Upload, Download, FileText, Database, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { toCSV, downloadCSV, formatDate, formatDateTime } from "@/lib/sgiau/format"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface AuditEntry {
  id: string
  action: string
  entity: string
  description: string | null
  createdAt: string
  user: { fullName: string } | null
}

const SAMPLES: Record<string, string> = {
  members: "firstName,lastName,sex,phone,email,faculty,department,level,academicYear\nJean,Dupont,M,0600000001,jean@example.com,Informatique et Gestion,,L1,2024-2025\nMarie,Curie,F,0600000002,marie@example.com,Électromécanique,,L2,2024-2025\nAwa,Diop,F,0600000003,awa@example.com,Administration,,AP,2024-2025",
  payments: "matricule,reference,amount,amountPaid,paymentMode,paymentDate,status\n2024-0001,P-IMP-001,5000,5000,CASH,2024-10-01,PAID\n2024-0001,P-IMP-002,10000,5000,MOBILE,2024-10-02,PARTIAL",
  expenses: "reference,label,amount,date,status,note\nE-IMP-001,Achat fournitures,25000,2024-10-01,PENDING,Papeterie\nE-IMP-002,Catering réunion,75000,2024-10-05,VALIDATED,Réunion mensuelle",
}

const CSV_HEADERS: Record<string, string> = {
  members: "firstName,lastName,sex,phone,email,faculty,department,level,academicYear",
  payments: "matricule,reference,amount,amountPaid,paymentMode,paymentDate,status",
  expenses: "reference,label,amount,date,status,note",
}

export default function ImportExportModule() {
  const [busy, setBusy] = useState<string | null>(null)
  const [history, setHistory] = useState<AuditEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/audit?entity=ImportExport&action=IMPORT&limit=20")
      const data = await res.json()
      setHistory(data.items || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
    return lines.slice(1).map((line) => {
      const cells = line.split(",").map((c) => c.replace(/^"|"$/g, ""))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => (row[h] = cells[i] ?? ""))
      return row
    })
  }

  function downloadSample(type: string) {
    const csv = SAMPLES[type]
    if (!csv) return
    downloadCSV(`modele-${type}.csv`, csv)
    toast.success(`Modèle ${type} téléchargé`)
  }

  async function importFile(file: File, type: string) {
    setBusy(type)
    const reader = new FileReader()
    reader.onload = async () => {
      const text = String(reader.result)
      const rows = parseCSV(text)
      if (rows.length === 0) {
        toast.error("Fichier vide ou mal formaté")
        setBusy(null)
        return
      }
      try {
        const res = await fetch(`/api/import-export/import?type=${type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rows),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Erreur")
        toast.success(`${data.imported} enregistrement(s) importé(s)${data.errors?.length ? `, ${data.errors.length} erreur(s)` : ""}`)
        loadHistory()
      } catch (e) {
        toast.error((e as Error).message)
      } finally {
        setBusy(null)
      }
    }
    reader.readAsText(file)
  }

  async function exportData(type: string) {
    setBusy(`export-${type}`)
    try {
      if (type === "base-complete") {
        const [membersRes, cotRes, expRes, receiptsRes] = await Promise.all([
          fetch("/api/members?limit=500").then((r) => r.json()),
          fetch("/api/cotisations?paymentsLimit=500").then((r) => r.json()),
          fetch("/api/expenses?limit=500").then((r) => r.json()),
          fetch("/api/receipts?limit=500").then((r) => r.json()),
        ])
        const blob = new Blob(
          [JSON.stringify({
            members: membersRes || [],
            payments: cotRes?.payments ?? [],
            cotisationTypes: cotRes?.types ?? [],
            expenses: expRes?.expenses ?? expRes ?? [],
            receipts: receiptsRes ?? [],
            exportedAt: new Date().toISOString(),
          }, null, 2)],
          { type: "application/json" }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url; a.download = `base-complete-${Date.now()}.json`; a.click()
        URL.revokeObjectURL(url)
        toast.success("Base complète exportée (JSON)")
        return
      }

      let rows: Record<string, unknown>[] = []
      if (type === "members") {
        const data = await fetch("/api/members?limit=500").then((r) => r.json())
        rows = (data || []).map((m: any) => ({
          matricule: m.matricule, prenom: m.firstName, nom: m.lastName, sexe: m.sex,
          telephone: m.phone, email: m.email, faculte: m.faculty, departement: m.department,
          niveau: m.level, annee: m.academicYear, statut: m.status,
        }))
      } else if (type === "payments") {
        const data = await fetch("/api/cotisations?paymentsLimit=500").then((r) => r.json())
        rows = (data.payments || []).map((p: any) => ({
          reference: p.reference, matricule: p.member?.matricule, membre: p.member ? `${p.member.firstName} ${p.member.lastName}` : "",
          cotisation: p.cotisationType?.name ?? "", montant: p.amount, montantPaye: p.amountPaid,
          mode: p.paymentMode, statut: p.status, date: formatDate(p.paymentDate),
        }))
      } else if (type === "expenses") {
        const data = await fetch("/api/expenses?limit=500").then((r) => r.json())
        const expenses = data.expenses || data || []
        rows = expenses.map((e: any) => ({
          reference: e.reference, libelle: e.label, montant: e.amount,
          categorie: e.category?.name ?? e.category ?? "", statut: e.status, date: formatDate(e.date),
        }))
      } else if (type === "receipts") {
        const data = await fetch("/api/receipts?limit=500").then((r) => r.json())
        rows = (Array.isArray(data) ? data : (data?.items ?? [])).map((r: any) => ({
          numero: r.number, matricule: r.member?.matricule, membre: r.member ? `${r.member.firstName} ${r.member.lastName}` : "",
          montant: r.amount, date: formatDate(r.createdAt), caissier: r.cashierId ?? "",
        }))
      }
      if (rows.length === 0) {
        toast.info("Aucune donnée à exporter")
      } else {
        downloadCSV(`${type}-${Date.now()}.csv`, toCSV(rows))
        toast.success(`${rows.length} enregistrement(s) exporté(s)`)
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export"
        description="Importez en masse vos données, exportez vos bases, suivez l'historique des imports"
        icon={ArrowUpDown}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Imports */}
        <SectionCard title="Import (CSV)" description="Téléchargez un modèle puis importez votre fichier">
          <div className="space-y-3">
            {[
              { type: "members", label: "Membres (CSV)", icon: "👥" },
              { type: "payments", label: "Paiements (CSV)", icon: "💰" },
              { type: "expenses", label: "Dépenses (CSV)", icon: "📉" },
            ].map((c) => (
              <div key={c.type} className="rounded-lg border p-3 flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground truncate">Colonnes: {CSV_HEADERS[c.type]}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadSample(c.type)} disabled={busy === c.type}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Modèle
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0], c.type)}
                  />
                  <Button size="sm" disabled={busy === c.type} asChild>
                    <span className="cursor-pointer">
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> {busy === c.type ? "Import…" : "Importer"}
                    </span>
                  </Button>
                </label>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Exports */}
        <SectionCard title="Export" description="Téléchargez vos données au format CSV ou JSON">
          <div className="space-y-3">
            {[
              { type: "members", label: "Membres", icon: "👥" },
              { type: "payments", label: "Paiements", icon: "💰" },
              { type: "expenses", label: "Dépenses", icon: "📉" },
              { type: "receipts", label: "Reçus", icon: "🧾" },
              { type: "base-complete", label: "Base complète (JSON)", icon: "🗄️" },
            ].map((c) => (
              <div key={c.type} className="rounded-lg border p-3 flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.type === "base-complete" ? "Export JSON complet" : "Export CSV"}</p>
                </div>
                <Button size="sm" disabled={busy === `export-${c.type}`} onClick={() => exportData(c.type)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> {busy === `export-${c.type}` ? "Export…" : "Exporter"}
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Import history */}
      <SectionCard title="Historique des imports" description="Journal des opérations d'import" actions={
        <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
          <History className="h-3.5 w-3.5 mr-1.5" /> Actualiser
        </Button>
      }>
        {historyLoading ? (
          <LoadingState rows={4} />
        ) : history.length === 0 ? (
          <EmptyState icon={Database} title="Aucun import enregistré" description="Vos imports apparaîtront ici." />
        ) : (
          <div className="rounded-lg border max-h-96 overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</TableCell>
                    <TableCell className="text-sm">{h.user?.fullName ?? "Système"}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">{h.action}</Badge></TableCell>
                    <TableCell className="text-sm">{h.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
