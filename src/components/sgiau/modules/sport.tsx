"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Trophy, Download, FileText, Eye, Users, AlarmClock, Dumbbell, ShieldCheck,
  Plus, Pencil, Trash2, Search, UserPlus, CheckCircle2, XCircle, CalendarDays,
} from "lucide-react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { toast } from "sonner"
import { formatDate } from "@/lib/sgiau/format"
import { FILIERES, LEVELS, AP_FILIERE, isAP, UCAB_FULL_NAME } from "@/lib/sgiau/constants"
import { cn } from "@/lib/utils"

const PDF_URL = "/documents/reglement-sportive.pdf"

// Règlement intérieur de la Compétition Sportive Inter-Classes
// (document officiel de la Commission Sportive — source : « Règlement sportive.pdf »)
const ARTICLES: { title: string; content: string[] }[] = [
  {
    title: "Article 1 — Objet",
    content: [
      "Le présent règlement a pour objectif d'assurer le bon déroulement des compétitions sportives inter-classes, dans un esprit de discipline, de fair-play et de respect.",
    ],
  },
  {
    title: "Article 2 — Participation",
    content: [
      "Chaque classe peut inscrire une seule équipe par discipline.",
      "Les joueurs doivent être régulièrement inscrits dans la classe représentée.",
      "Un joueur ne peut représenter qu'une seule classe durant toute la compétition.",
    ],
  },
  {
    title: "Article 3 — Composition des équipes",
    content: [
      "Le nombre de joueurs par équipe est fixé selon la discipline concernée.",
      "Aucun changement de joueurs n'est autorisé après le début de la compétition, sauf cas exceptionnel validé par la Commission Sportive.",
      "Tout joueur doit être identifié avant le début des matchs.",
    ],
  },
  {
    title: "Article 4 — Engagement des joueurs",
    content: [
      "Chaque joueur s'engage à :",
      "Respecter ses coéquipiers, adversaires, arbitres et responsables.",
      "Défendre loyalement les couleurs de sa classe.",
      "Respecter le présent règlement intérieur.",
      "Accepter les décisions arbitrales sans contestation.",
    ],
  },
  {
    title: "Article 5 — Discipline et comportement",
    content: [
      "Il est formellement interdit :",
      "Les insultes, provocations ou menaces.",
      "Les violences verbales ou physiques.",
      "Toute contestation excessive des décisions arbitrales.",
      "Tout comportement portant atteinte à l'image de l'Amicale.",
    ],
  },
  {
    title: "Article 6 — Assiduité et ponctualité",
    content: [
      "Les équipes doivent se présenter à l'heure indiquée.",
      "Un retard de plus de 10 minutes peut entraîner un forfait.",
      "Toute équipe absente est déclarée perdante par forfait.",
    ],
  },
  {
    title: "Article 7 — Tenue sportive",
    content: [
      "Une tenue correcte et décente est obligatoire.",
      "Les équipes doivent porter des couleurs distinctes.",
      "Tout joueur non conforme peut être exclu du match.",
    ],
  },
  {
    title: "Article 8 — Arbitrage",
    content: [
      "Les arbitres sont désignés par la Commission Sportive.",
      "Les décisions arbitrales sont définitives et sans appel.",
      "Tout manque de respect envers l'arbitrage est sanctionné.",
    ],
  },
  {
    title: "Article 9 — Public et supporters",
    content: [
      "Les supporters doivent adopter un comportement responsable.",
      "Toute provocation ou trouble causé par une classe engage la responsabilité de son équipe.",
      "La Commission Sportive peut exclure tout public perturbateur.",
    ],
  },
  {
    title: "Article 10 — Participation financière",
    content: [
      "Chaque équipe engagée dans la compétition inter-classes doit verser une participation financière obligatoire à titre d'engagement.",
      "Le montant de cette participation est fixé par la Commission Sportive avant le début de la compétition.",
      "Aucune équipe ne sera autorisée à participer tant que la somme exigée n'aura pas été intégralement versée.",
      "Cette participation contribue à l'organisation, à l'arbitrage et au bon déroulement des compétitions.",
      "La somme versée est non remboursable, sauf décision exceptionnelle de la Commission Sportive.",
    ],
  },
  {
    title: "Article 11 — Sanctions",
    content: [
      "Selon la gravité de la faute :",
      "Avertissement",
      "Exclusion temporaire ou définitive du joueur",
      "Perte du match",
      "Disqualification de l'équipe",
    ],
  },
  {
    title: "Article 12 — Réclamations",
    content: [
      "Toute réclamation doit être déposée par le capitaine auprès de la Commission Sportive dans un délai de 24 heures.",
      "Les décisions de la Commission Sportive sont définitives.",
    ],
  },
  {
    title: "Article 13 — Cas non prévus",
    content: [
      "Tout cas non prévu par le présent règlement est tranché par la Commission Sportive.",
    ],
  },
  {
    title: "Article 14 — Disposition finale",
    content: [
      "La participation à la compétition inter-classes vaut acceptation totale du présent règlement intérieur.",
    ],
  },
]

// ============================================================
// Types & étiquettes
// ============================================================

interface Discipline {
  id: string; name: string; description: string | null; teamSize: number
  active: boolean; createdAt: string; _count?: { teams: number }
}

interface Team {
  id: string; disciplineId: string; className: string; level: string
  name: string; captainName: string | null; players: string | null
  status: string; createdAt: string
  discipline?: Discipline
  member?: { id: string; matricule: string; firstName: string; lastName: string } | null
}

interface Match {
  id: string; disciplineId: string; teamAId: string; teamBId: string
  date: string; location: string | null; phase: string; status: string
  scoreA: number | null; scoreB: number | null
  discipline?: Discipline
  teamA?: Team
  teamB?: Team
}

const TEAM_STATUS: Record<string, { label: string; cls: string }> = {
  INSCRIPTION: { label: "Inscription", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  CONFIRMED: { label: "Confirmée", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  REJECTED: { label: "Rejetée", cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
}

const MATCH_PHASE: Record<string, string> = {
  POOL: "Poules", QUARTER: "Quart de finale", SEMI: "Demi-finale", FINAL: "Finale",
}
const MATCH_STATUS: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Planifié", cls: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" },
  PLAYED: { label: "Joué", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  CANCELLED: { label: "Annulé", cls: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
}

const emptyDisciplineForm = { name: "", description: "", teamSize: "5", active: true }
const emptyTeamForm = { disciplineId: "", className: "", level: "", name: "", captainName: "", players: "", status: "INSCRIPTION" }
const emptyMatchForm = {
  disciplineId: "", teamAId: "", teamBId: "", date: "", location: "",
  phase: "POOL", status: "SCHEDULED", scoreA: "", scoreB: "",
}

function classLabel(className: string, level: string): string {
  return `${className}${level ? ` · ${level}` : ""}`
}

function isoToLocalInput(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function playersList(players: string | null): string[] {
  if (!players) return []
  try {
    const v = JSON.parse(players)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

export default function SportModule() {
  // ——— Données ———
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  // ——— Filtres équipes ———
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  // ——— Formulaires ———
  const [discOpen, setDiscOpen] = useState(false)
  const [discEditing, setDiscEditing] = useState<Discipline | null>(null)
  const [discForm, setDiscForm] = useState(emptyDisciplineForm)
  const [discSaving, setDiscSaving] = useState(false)

  const [teamOpen, setTeamOpen] = useState(false)
  const [teamEditing, setTeamEditing] = useState<Team | null>(null)
  const [teamForm, setTeamForm] = useState(emptyTeamForm)
  const [teamSaving, setTeamSaving] = useState(false)

  const [matchOpen, setMatchOpen] = useState(false)
  const [matchEditing, setMatchEditing] = useState<Match | null>(null)
  const [matchForm, setMatchForm] = useState(emptyMatchForm)
  const [matchSaving, setMatchSaving] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/sport/disciplines").then((r) => r.json()),
      fetch("/api/sport/teams").then((r) => r.json()),
      fetch("/api/sport/matches").then((r) => r.json()),
    ])
      .then(([d, t, m]) => {
        setDisciplines(Array.isArray(d) ? d : [])
        setTeams(Array.isArray(t) ? t : [])
        setMatches(Array.isArray(m) ? m : [])
      })
      .catch(() => toast.error("Impossible de charger les données sportives"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const activeDisciplines = disciplines.filter((d) => d.active)
  const teamsCount = teams.length
  const confirmedCount = teams.filter((t) => t.status === "CONFIRMED").length
  const confirmedTeams = teams.filter((t) => t.status === "CONFIRMED")

  const filteredTeams = teams.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false
    if (!q) return true
    const hay = `${t.name} ${t.className} ${t.level} ${t.captainName ?? ""} ${t.discipline?.name ?? ""}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  // ——— Disciplines ———
  function openCreateDiscipline() {
    setDiscEditing(null)
    setDiscForm(emptyDisciplineForm)
    setDiscOpen(true)
  }
  function openEditDiscipline(d: Discipline) {
    setDiscEditing(d)
    setDiscForm({ name: d.name, description: d.description ?? "", teamSize: String(d.teamSize), active: d.active })
    setDiscOpen(true)
  }
  async function saveDiscipline() {
    if (!discForm.name.trim()) { toast.error("Le nom de la discipline est requis"); return }
    setDiscSaving(true)
    try {
      const res = await fetch(discEditing ? `/api/sport/disciplines/${discEditing.id}` : "/api/sport/disciplines", {
        method: discEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(discEditing ? "Discipline modifiée" : "Discipline créée")
      setDiscOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDiscSaving(false)
    }
  }
  async function removeDiscipline(d: Discipline) {
    if (!confirm(`Supprimer la discipline « ${d.name} » ?`)) return
    const res = await fetch(`/api/sport/disciplines/${d.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Discipline supprimée"); load() }
    else toast.error(data?.error || "Échec de la suppression")
  }

  // ——— Équipes ———
  function openCreateTeam() {
    setTeamEditing(null)
    setTeamForm(emptyTeamForm)
    setTeamOpen(true)
  }
  function openEditTeam(t: Team) {
    setTeamEditing(t)
    setTeamForm({
      disciplineId: t.disciplineId,
      className: t.className,
      level: t.level,
      name: t.name,
      captainName: t.captainName ?? "",
      players: playersList(t.players).join("\n"),
      status: t.status,
    })
    setTeamOpen(true)
  }
  async function saveTeam() {
    if (!teamForm.disciplineId) { toast.error("Choisissez une discipline"); return }
    if (!teamForm.className) { toast.error("Choisissez la classe (filière)"); return }
    setTeamSaving(true)
    try {
      const res = await fetch(teamEditing ? `/api/sport/teams/${teamEditing.id}` : "/api/sport/teams", {
        method: teamEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(teamEditing ? "Équipe modifiée" : "Équipe inscrite")
      setTeamOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTeamSaving(false)
    }
  }
  async function removeTeam(t: Team) {
    if (!confirm(`Retirer l'équipe « ${t.name} » ?`)) return
    const res = await fetch(`/api/sport/teams/${t.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Équipe retirée"); load() }
    else toast.error("Échec de la suppression")
  }

  async function setTeamStatus(t: Team, status: string) {
    try {
      const res = await fetch(`/api/sport/teams/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(status === "CONFIRMED" ? `Équipe « ${t.name} » confirmée` : `Équipe « ${t.name} » rejetée`)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // ——— Matchs ———
  const teamsOfMatchDiscipline = teams.filter(
    (t) => t.disciplineId === matchForm.disciplineId && t.status !== "REJECTED"
  )

  function openCreateMatch() {
    setMatchEditing(null)
    setMatchForm(emptyMatchForm)
    setMatchOpen(true)
  }
  function openEditMatch(m: Match) {
    setMatchEditing(m)
    setMatchForm({
      disciplineId: m.disciplineId,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      date: isoToLocalInput(m.date),
      location: m.location ?? "",
      phase: m.phase,
      status: m.status,
      scoreA: m.scoreA === null || m.scoreA === undefined ? "" : String(m.scoreA),
      scoreB: m.scoreB === null || m.scoreB === undefined ? "" : String(m.scoreB),
    })
    setMatchOpen(true)
  }
  async function saveMatch() {
    if (!matchForm.disciplineId) { toast.error("Choisissez une discipline"); return }
    if (!matchForm.teamAId || !matchForm.teamBId) { toast.error("Choisissez les deux équipes"); return }
    if (matchForm.teamAId === matchForm.teamBId) { toast.error("Une équipe ne peut pas jouer contre elle-même"); return }
    if (!matchForm.date) { toast.error("La date du match est requise"); return }
    setMatchSaving(true)
    try {
      const payload = {
        disciplineId: matchForm.disciplineId,
        teamAId: matchForm.teamAId,
        teamBId: matchForm.teamBId,
        date: new Date(matchForm.date).toISOString(),
        location: matchForm.location || null,
        phase: matchForm.phase,
        status: matchForm.status,
        scoreA: matchForm.scoreA === "" ? null : Number(matchForm.scoreA),
        scoreB: matchForm.scoreB === "" ? null : Number(matchForm.scoreB),
      }
      const res = await fetch(matchEditing ? `/api/sport/matches/${matchEditing.id}` : "/api/sport/matches", {
        method: matchEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(matchEditing ? "Match modifié" : "Match programmé")
      setMatchOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setMatchSaving(false)
    }
  }
  async function removeMatch(m: Match) {
    if (!confirm("Supprimer ce match ?")) return
    const res = await fetch(`/api/sport/matches/${m.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Match supprimé"); load() }
    else toast.error("Échec de la suppression")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sport"
        description="Commission Sportive — disciplines, équipes inter-classes et règlement"
        icon={Trophy}
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <a href={PDF_URL} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" /> Ouvrir le PDF
              </a>
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <a href={PDF_URL} download>
                <Download className="h-4 w-4" /> Télécharger le règlement
              </a>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Disciplines actives" value={loading ? "…" : activeDisciplines.length} icon={Dumbbell} loading={loading} />
        <StatCard title="Équipes inscrites" value={loading ? "…" : teamsCount} icon={Users} tone="success" loading={loading} hint="Une équipe par classe et par discipline" />
        <StatCard title="Équipes confirmées" value={loading ? "…" : confirmedCount} icon={ShieldCheck} tone="info" loading={loading} />
        <StatCard title="Délai de réclamation" value="24 h" icon={AlarmClock} tone="warning" hint="Dépôt par le capitaine auprès de la Commission" />
      </div>

      {/* ===== Disciplines ===== */}
      <SectionCard
        title="Disciplines sportives"
        description="Disciplines proposées aux compétitions inter-classes (football, basket…) et taille des équipes."
        actions={
          <Button size="sm" className="gap-2" onClick={openCreateDiscipline}>
            <Plus className="h-4 w-4" /> Nouvelle discipline
          </Button>
        }
      >
        {loading ? (
          <LoadingState rows={4} />
        ) : disciplines.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Aucune discipline"
            description="Ajoutez les disciplines de la compétition (football, basketball, volleyball…)."
            action={<Button onClick={openCreateDiscipline} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle discipline</Button>}
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Discipline</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead>Joueurs/équipe</TableHead>
                  <TableHead className="hidden md:table-cell">Équipes</TableHead>
                  <TableHead className="hidden md:table-cell">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disciplines.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-1.5"><Dumbbell className="h-4 w-4 text-primary" /></div>
                        <span className="font-medium">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[260px] truncate">{d.description ?? "—"}</TableCell>
                    <TableCell className="text-sm">{d.teamSize}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{d._count?.teams ?? 0}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={d.active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}>
                        {d.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDiscipline(d)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDiscipline(d)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* ===== Équipes par classe ===== */}
      <SectionCard
        title="Équipes inscrites par classe"
        description="Une équipe par classe et par discipline (art. 2 du règlement)."
        actions={
          <Button size="sm" className="gap-2" onClick={openCreateTeam} disabled={activeDisciplines.length === 0}>
            <UserPlus className="h-4 w-4" /> Inscrire une équipe
          </Button>
        }
      >
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Équipe, classe, capitaine, discipline…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(TEAM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={5} />
        ) : teams.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="Aucune équipe inscrite"
            description="Inscrivez la première équipe de la compétition inter-classes."
            action={<Button onClick={openCreateTeam} className="gap-2" disabled={activeDisciplines.length === 0}><UserPlus className="h-4 w-4" /> Inscrire une équipe</Button>}
          />
        ) : (
          <div className="rounded-lg border max-h-[55vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Équipe</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="hidden sm:table-cell">Discipline</TableHead>
                  <TableHead className="hidden md:table-cell">Capitaine</TableHead>
                  <TableHead className="hidden lg:table-cell">Joueurs</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Aucune équipe ne correspond aux filtres</TableCell></TableRow>
                ) : filteredTeams.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 shrink-0 text-primary" />
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{classLabel(t.className, t.level)}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{t.discipline?.name ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <p>{t.captainName ?? "—"}</p>
                      {t.member && (
                        <p className="text-[10px] text-muted-foreground">déposée par {t.member.firstName} {t.member.lastName} · {t.member.matricule}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{playersList(t.players).length > 0 ? `${playersList(t.players).length} joueur(s)` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0", TEAM_STATUS[t.status]?.cls ?? "")}>
                        {TEAM_STATUS[t.status]?.label ?? t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {t.status === "INSCRIPTION" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600"
                              title="Valider l'équipe"
                              onClick={() => setTeamStatus(t, "CONFIRMED")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Rejeter l'équipe"
                              onClick={() => setTeamStatus(t, "REJECTED")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTeam(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTeam(t)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* ===== Calendrier des matchs ===== */}
      <SectionCard
        title="Calendrier des matchs"
        description="Programmation des rencontres entre équipes inscrites — visible par les membres dans leur calendrier."
        actions={
          <Button size="sm" className="gap-2" onClick={openCreateMatch} disabled={confirmedTeams.length < 2}>
            <CalendarDays className="h-4 w-4" /> Programmer un match
          </Button>
        }
      >
        {loading ? (
          <LoadingState rows={4} />
        ) : matches.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Aucun match programmé"
            description={confirmedTeams.length < 2 ? "Il faut au moins 2 équipes confirmées dans une même discipline pour programmer un match." : "Programmez le premier match de la compétition."}
            action={<Button onClick={openCreateMatch} className="gap-2" disabled={confirmedTeams.length < 2}><CalendarDays className="h-4 w-4" /> Programmer un match</Button>}
          />
        ) : (
          <div className="rounded-lg border max-h-[55vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Phase</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead className="hidden md:table-cell">Discipline</TableHead>
                  <TableHead className="hidden lg:table-cell">Lieu</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => {
                  const played = m.status === "PLAYED"
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(m.date)}
                        {m.phase !== "POOL" && <span className="hidden sm:inline text-muted-foreground text-xs"> · {MATCH_PHASE[m.phase] ?? m.phase}</span>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{MATCH_PHASE[m.phase] ?? m.phase}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="max-w-[140px] truncate font-medium">{m.teamA?.name ?? "—"}</span>
                          {played && m.scoreA !== null && m.scoreB !== null ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums">{m.scoreA} – {m.scoreB}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">vs</span>
                          )}
                          <span className="max-w-[140px] truncate font-medium">{m.teamB?.name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{m.discipline?.name ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{m.location ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border-0", MATCH_STATUS[m.status]?.cls ?? "")}>
                          {MATCH_STATUS[m.status]?.label ?? m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditMatch(m)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMatch(m)}><Trash2 className="h-4 w-4" /></Button>
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

      {/* ===== Règlement ===== */}
      <SectionCard
        title="Règlement officiel — Compétition Sportive Inter-Classes"
        description={`Document officiel établi par la Commission Sportive (${UCAB_FULL_NAME}).`}
        actions={
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            PDF · 3 pages
          </Badge>
        }
      >
        <div className="rounded-lg border overflow-hidden">
          <iframe
            src={`${PDF_URL}#toolbar=1&view=FitH`}
            title="Règlement sportif inter-classes"
            className="w-full h-[70vh] bg-muted"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Règlement intérieur — les 14 articles"
        description="Synthèse lisible du règlement. Le PDF ci-dessus fait foi."
        contentClassName="p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARTICLES.map((a) => (
            <div key={a.title} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 shrink-0 text-primary" />
                <h3 className="font-semibold text-sm">{a.title}</h3>
              </div>
              <ul className="space-y-1">
                {a.content.map((line, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {a.content.length > 1 && i === 0 && a.content[0].endsWith(":") ? (
                      <span className="text-foreground font-medium">{line}</span>
                    ) : (
                      <span className={a.content.length > 1 ? "block" : ""}>{line}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ===== Dialog Discipline ===== */}
      <Dialog open={discOpen} onOpenChange={setDiscOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{discEditing ? "Modifier la discipline" : "Nouvelle discipline"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nom *</Label>
              <Input value={discForm.name} onChange={(e) => setDiscForm({ ...discForm, name: e.target.value })} placeholder="Football" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea rows={2} value={discForm.description} onChange={(e) => setDiscForm({ ...discForm, description: e.target.value })} placeholder="Règles spécifiques, durée des matchs…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Joueurs par équipe</Label>
              <Input type="number" min={1} value={discForm.teamSize} onChange={(e) => setDiscForm({ ...discForm, teamSize: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="disc-active"
                type="checkbox"
                checked={discForm.active}
                onChange={(e) => setDiscForm({ ...discForm, active: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="disc-active" className="text-xs font-medium">Discipline active (visible pour l'inscription des équipes)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscOpen(false)}>Annuler</Button>
            <Button onClick={saveDiscipline} disabled={discSaving}>{discSaving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Match ===== */}
      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{matchEditing ? "Modifier le match" : "Programmer un match"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Discipline *</Label>
              <Select
                value={matchForm.disciplineId}
                onValueChange={(v) => setMatchForm({ ...matchForm, disciplineId: v, teamAId: "", teamBId: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {disciplines.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Équipe A *</Label>
              <Select value={matchForm.teamAId} onValueChange={(v) => setMatchForm({ ...matchForm, teamAId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {teamsOfMatchDiscipline.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">Aucune équipe dans cette discipline</p>
                  ) : teamsOfMatchDiscipline.map((t) => (
                    <SelectItem key={t.id} value={t.id} disabled={t.id === matchForm.teamBId}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Équipe B *</Label>
              <Select value={matchForm.teamBId} onValueChange={(v) => setMatchForm({ ...matchForm, teamBId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {teamsOfMatchDiscipline.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">Aucune équipe dans cette discipline</p>
                  ) : teamsOfMatchDiscipline.map((t) => (
                    <SelectItem key={t.id} value={t.id} disabled={t.id === matchForm.teamAId}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date et heure *</Label>
              <Input type="datetime-local" value={matchForm.date} onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lieu</Label>
              <Input value={matchForm.location} onChange={(e) => setMatchForm({ ...matchForm, location: e.target.value })} placeholder="Terrain, salle…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phase</Label>
              <Select value={matchForm.phase} onValueChange={(v) => setMatchForm({ ...matchForm, phase: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MATCH_PHASE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Statut</Label>
              <Select value={matchForm.status} onValueChange={(v) => setMatchForm({ ...matchForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MATCH_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Score équipe A</Label>
              <Input type="number" min={0} placeholder="—" value={matchForm.scoreA} onChange={(e) => setMatchForm({ ...matchForm, scoreA: e.target.value })} disabled={matchForm.status !== "PLAYED"} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Score équipe B</Label>
              <Input type="number" min={0} placeholder="—" value={matchForm.scoreB} onChange={(e) => setMatchForm({ ...matchForm, scoreB: e.target.value })} disabled={matchForm.status !== "PLAYED"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchOpen(false)}>Annuler</Button>
            <Button onClick={saveMatch} disabled={matchSaving}>{matchSaving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Équipe ===== */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{teamEditing ? "Modifier l'équipe" : "Inscrire une équipe"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Discipline *</Label>
              <Select value={teamForm.disciplineId} onValueChange={(v) => setTeamForm({ ...teamForm, disciplineId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {activeDisciplines.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Statut</Label>
              <Select value={teamForm.status} onValueChange={(v) => setTeamForm({ ...teamForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TEAM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Classe (filière) *</Label>
              <Select
                value={teamForm.className}
                onValueChange={(v) => setTeamForm({ ...teamForm, className: v, ...(isAP(v) ? { level: "" } : {}) })}
              >
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {FILIERES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Niveau</Label>
              <Select value={teamForm.level} disabled={isAP(teamForm.className)} onValueChange={(v) => setTeamForm({ ...teamForm, level: v })}>
                <SelectTrigger><SelectValue placeholder={isAP(teamForm.className) ? "Aucun niveau" : "Choisir…"} /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              {isAP(teamForm.className) && <p className="text-[10px] text-muted-foreground">L'Année Préparatoire n'a pas de niveau.</p>}
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Nom de l'équipe</Label>
              <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Laissez vide pour « Classe — Discipline »" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Capitaine</Label>
              <Input value={teamForm.captainName} onChange={(e) => setTeamForm({ ...teamForm, captainName: e.target.value })} placeholder="Nom du capitaine" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Joueurs (un par ligne)</Label>
              <Textarea rows={4} value={teamForm.players} onChange={(e) => setTeamForm({ ...teamForm, players: e.target.value })} placeholder={"Nom du joueur 1\nNom du joueur 2\n…"} />
              <p className="text-[10px] text-muted-foreground">Tout joueur doit être inscrit dans la classe représentée (art. 2).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamOpen(false)}>Annuler</Button>
            <Button onClick={saveTeam} disabled={teamSaving}>{teamSaving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
