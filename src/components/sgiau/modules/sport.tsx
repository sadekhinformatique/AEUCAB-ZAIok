"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Trophy, Download, FileText, Eye, Users, Dumbbell, ShieldCheck, Flag,
  Plus, Pencil, Trash2, Search, UserPlus, CheckCircle2, XCircle, CalendarDays,
  Medal, ClipboardCheck, PlayCircle, Lock, Unlock, RotateCcw,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatDate, formatDateTime } from "@/lib/sgiau/format"
import { FILIERES, LEVELS, isAP, UCAB_FULL_NAME, isSportResponsable, classLabel } from "@/lib/sgiau/constants"
import { cn } from "@/lib/utils"

const PDF_URL = "/documents/reglement-sportive.pdf"

const ARTICLES: { title: string; content: string[] }[] = [
  {
    title: "Article 1 — Objet",
    content: ["Le présent règlement a pour objectif d'assurer le bon déroulement des compétitions sportives inter-classes, dans un esprit de discipline, de fair-play et de respect."],
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
    content: ["Tout cas non prévu par le présent règlement est tranché par la Commission Sportive."],
  },
  {
    title: "Article 14 — Disposition finale",
    content: ["La participation à la compétition inter-classes vaut acceptation totale du présent règlement intérieur."],
  },
]

// ============================================================
// Types & étiquettes
// ============================================================

interface SimpleMember { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; level: string | null; status: string }

interface Discipline {
  id: string; name: string; description: string | null; teamSize: number
  minTeamSize: number | null; maxTeamSize: number | null
  active: boolean; createdAt: string; _count?: { teams: number }
  positions?: { id: string; name: string }[]
}

interface Competition {
  id: string; name: string; description: string | null; academicYear: string | null
  startDate: string | null; endDate: string | null; fee: number; status: string
  classes: string | null; launchedAt: string | null; createdAt: string
  _count?: { teams: number; delegates: number; referees: number; participants: number }
  disciplines: { disciplineId: string; discipline: Discipline }[]
}

interface Delegate {
  id: string; competitionId: string; className: string; level: string; memberId: string
  status: string; appointedAt: string; validatedAt: string | null
  member: SimpleMember | null
  competition: { id: string; name: string; status: string } | null
}

interface Referee {
  id: string; competitionId: string; fullName: string; memberId: string | null; status: string
  note: string | null; createdAt: string; validatedAt: string | null
  member: SimpleMember | null
  competition: { id: string; name: string; status: string } | null
}

interface Participant {
  id: string; competitionId: string; firstName: string; lastName: string
  function: string | null; phone: string | null; email: string | null; createdAt: string
}

interface PlayerDetail { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; level: string | null; status: string }

interface Team {
  id: string; competitionId: string | null; disciplineId: string; className: string; level: string
  name: string; kind: string; captainName: string | null; captainId: string | null
  players: string | null; participants: string | null
  status: string; refusalReason: string | null; submittedAt: string | null; validatedAt: string | null
  createdAt: string
  competition: { id: string; name: string; status: string } | null
  discipline?: Discipline
  delegate?: SimpleMember | null
  member?: SimpleMember | null
  playersDetails?: PlayerDetail[]
  participantsDetails?: Participant[]
  attachments?: { url: string; name: string; type?: string; size?: number }[]
}

interface Match {
  id: string; disciplineId: string; teamAId: string; teamBId: string; refereeId: string | null
  date: string; location: string | null; phase: string; status: string
  scoreA: number | null; scoreB: number | null
  sheet?: Record<string, unknown> | null
  sheetStatus?: string
  sheetNumber?: string | null
  sheetConfirmedAt?: string | null
  discipline?: Discipline
  teamA?: Team
  teamB?: Team
  referee?: { id: string; fullName: string; status: string } | null
}

interface SheetPlayer { name: string; number: number | null; goals: number; cards: string }
interface MatchSheet {
  scoreA: number; scoreB: number
  playersA: SheetPlayer[]; playersB: SheetPlayer[]
  refereeName: string; observations: string
}

const EMPTY_SHEET: MatchSheet = { scoreA: 0, scoreB: 0, playersA: [], playersB: [], refereeName: "", observations: "" }

const SHEET_STATUS: Record<string, { label: string; cls: string }> = {
  NONE: { label: "Pas de feuille", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  DRAFT: { label: "Feuille brouillon", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  CONFIRMED: { label: "Feuille confirmée", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
}

interface StandingRow {
  teamId: string; teamName: string; className: string; level: string
  played: number; won: number; drawn: number; lost: number
  goalsFor: number; goalsAgainst: number; goalDiff: number; points: number
}

function parseSheet(raw: unknown): MatchSheet {
  const s = (raw ?? {}) as Record<string, unknown>
  const clean = (list: unknown): SheetPlayer[] =>
    (Array.isArray(list) ? list : []).map((p) => {
      const pp = (p ?? {}) as Record<string, unknown>
      return {
        name: typeof pp.name === "string" ? pp.name : "",
        number: pp.number === null || pp.number === undefined || pp.number === "" ? null : Number(pp.number),
        goals: pp.goals === null || pp.goals === undefined || pp.goals === "" ? 0 : Number(pp.goals),
        cards: typeof pp.cards === "string" ? pp.cards : "NONE",
      }
    })
  return {
    scoreA: Number(s.scoreA) || 0,
    scoreB: Number(s.scoreB) || 0,
    playersA: clean(s.playersA),
    playersB: clean(s.playersB),
    refereeName: typeof s.refereeName === "string" ? s.refereeName : "",
    observations: typeof s.observations === "string" ? s.observations : "",
  }
}

const COMP_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Préparation", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  OPEN: { label: "Inscriptions ouvertes", cls: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" },
  LAUNCHED: { label: "Lancée", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  CLOSED: { label: "Clôturée", cls: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
}

const TEAM_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  SUBMITTED: { label: "Soumise", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  UNDER_REVIEW: { label: "En vérification", cls: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" },
  VALIDATED: { label: "Validée", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  RETURNED: { label: "Retournée pour correction", cls: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  REJECTED: { label: "Refusée", cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
}

const DELEGATE_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "À valider", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  ACTIVE: { label: "Actif", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  REVOKED: { label: "Révoqué", cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
}

const REFEREE_STATUS: Record<string, { label: string; cls: string }> = {
  SELECTED: { label: "Sélectionné", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  VALIDATED: { label: "Validé", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  REVOKED: { label: "Révoqué", cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
}

const MATCH_PHASE: Record<string, string> = {
  POOL: "Poules", QUARTER: "Quart de finale", SEMI: "Demi-finale", FINAL: "Finale",
}
const CARD_OPTIONS: { value: string; label: string }[] = [
  { value: "NONE", label: "Aucun carton" },
  { value: "YELLOW", label: "Carton jaune" },
  { value: "DOUBLE_YELLOW", label: "Deuxième jaune" },
  { value: "RED", label: "Carton rouge" },
]
const MATCH_STATUS: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Planifié", cls: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" },
  PLAYED: { label: "Joué", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  CANCELLED: { label: "Annulé", cls: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
}

interface ClassCombo { className: string; level: string }

function parseClasses(value: string | null): ClassCombo[] {
  if (!value) return []
  try {
    const v = JSON.parse(value)
    return Array.isArray(v) ? v.filter((c: unknown) => !!c && typeof (c as ClassCombo).className === "string") : []
  } catch {
    return []
  }
}

function playersIdList(players: string | null): string[] {
  if (!players) return []
  try {
    const v = JSON.parse(players)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

function isoToLocalInput(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const ALL_COMBOS: ClassCombo[] = (FILIERES as readonly string[]).flatMap((f) =>
  isAP(f) ? [{ className: f, level: "" }] : LEVELS.map((l) => ({ className: f, level: l }))
)

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const s = map[status]
  return <Badge variant="outline" className={cn("border-0", s?.cls ?? "")}>{s?.label ?? status}</Badge>
}

export default function SportModule() {
  const [isRSA, setIsRSA] = useState(false)
  const [loading, setLoading] = useState(true)

  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [referees, setReferees] = useState<Referee[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [standingsComp, setStandingsComp] = useState("ALL")
  const [standingsDisc, setStandingsDisc] = useState("ALL")
  const [standingsLoading, setStandingsLoading] = useState(false)

  const [compFilter, setCompFilter] = useState("ALL")
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/users/me").then((r) => r.json()).catch(() => ({ user: null })),
      fetch("/api/sport/competitions").then((r) => r.json()).catch(() => []),
      fetch("/api/sport/disciplines").then((r) => r.json()).catch(() => []),
      fetch("/api/sport/delegates").then((r) => r.json()).catch(() => []),
      fetch("/api/sport/teams").then((r) => r.json()).catch(() => []),
      fetch("/api/sport/referees").then((r) => r.json()).catch(() => []),
      fetch("/api/sport/participants").then((r) => r.json()).catch(() => []),
      fetch("/api/sport/matches").then((r) => r.json()).catch(() => []),
    ])
      .then(([me, c, d, dl, t, rf, p, m]) => {
        setIsRSA(isSportResponsable((me as { user?: { role?: string } })?.user?.role))
        setCompetitions(Array.isArray(c) ? c : [])
        setDisciplines(Array.isArray(d) ? d : [])
        setDelegates(Array.isArray(dl) ? dl : [])
        setTeams(Array.isArray(t) ? t : [])
        setReferees(Array.isArray(rf) ? rf : [])
        setParticipants(Array.isArray(p) ? p : [])
        setMatches(Array.isArray(m) ? m : [])
      })
      .catch(() => toast.error("Impossible de charger les données sportives"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Classements : chargés dès qu'une compétition ET une discipline sont choisies
  useEffect(() => {
    if (standingsComp === "ALL" || standingsDisc === "ALL") {
      void Promise.resolve().then(() => {
        setStandings([])
        setStandingsLoading(false)
      })
      return
    }
    void (async () => {
      setStandingsLoading(true)
      try {
        const r = await fetch(`/api/sport/standings?competitionId=${standingsComp}&disciplineId=${standingsDisc}`)
        const data = await r.json()
        setStandings(Array.isArray(data) ? data : [])
      } catch {
        setStandings([])
      } finally {
        setStandingsLoading(false)
      }
    })()
  }, [standingsComp, standingsDisc])

  const compOf = (team: Team) => competitions.find((c) => c.id === team.competitionId)

  const filteredTeams = teams.filter((t) => {
    if (compFilter !== "ALL" && t.competitionId !== compFilter) return false
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false
    if (!q) return true
    const hay = `${t.name} ${t.className} ${t.level} ${t.captainName ?? ""} ${t.discipline?.name ?? ""}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })
  const filteredDelegates = delegates.filter((d) => compFilter === "ALL" || d.competitionId === compFilter)
  const filteredReferees = referees.filter((r) => compFilter === "ALL" || r.competitionId === compFilter)
  const filteredParticipants = participants.filter((p) => compFilter === "ALL" || p.competitionId === compFilter)
  const filteredMatches = matches.filter((m) => compFilter === "ALL" || m.teamA?.competitionId === compFilter)

  const validatedTeams = teams.filter((t) => t.status === "VALIDATED")
  const openComps = competitions.filter((c) => c.status === "OPEN")
  const validatedReferees = referees.filter((r) => r.status === "VALIDATED")

  const rsa = isRSA

  // ——— Dialogues ———
  const [compOpen, setCompOpen] = useState(false)
  const [compEditing, setCompEditing] = useState<Competition | null>(null)
  const [delegateOpen, setDelegateOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [teamEditing, setTeamEditing] = useState<Team | null>(null)
  const [refuseTarget, setRefuseTarget] = useState<Team | null>(null)
  const [refuseMode, setRefuseMode] = useState<"REJECT" | "RETURN">("REJECT")
  const [detailTarget, setDetailTarget] = useState<Team | null>(null)
  const [refereeOpen, setRefereeOpen] = useState(false)
  const [refereeEditing, setRefereeEditing] = useState<Referee | null>(null)
  const [participantOpen, setParticipantOpen] = useState(false)
  const [participantEditing, setParticipantEditing] = useState<Participant | null>(null)
  const [matchOpen, setMatchOpen] = useState(false)
  const [matchEditing, setMatchEditing] = useState<Match | null>(null)
  const [sheetTarget, setSheetTarget] = useState<Match | null>(null)
  const [discOpen, setDiscOpen] = useState(false)
  const [discEditing, setDiscEditing] = useState<Discipline | null>(null)

  function openCompetitionDialog(c: Competition | null) { setCompEditing(c); setCompOpen(true) }
  function openDelegateDialog() { setDelegateOpen(true) }
  function openTeamDialog(t: Team | null) { setTeamEditing(t); setTeamOpen(true) }
  function openTeamDetail(t: Team) { setDetailTarget(t) }
  function openRefuseDialog(t: Team, mode: "REJECT" | "RETURN" = "REJECT") { setRefuseMode(mode); setRefuseTarget(t) }
  function openParticipantDialog(p: Participant | null) { setParticipantEditing(p); setParticipantOpen(true) }
  function openRefereeDialog(r: Referee | null) { setRefereeEditing(r); setRefereeOpen(true) }
  function openMatchDialog(m: Match | null) { setMatchEditing(m); setMatchOpen(true) }
  function openSheetDialog(m: Match) { setSheetTarget(m) }
  function openDisciplineDialog(d: Discipline | null) { setDiscEditing(d); setDiscOpen(true) }

  async function setCompStatus(c: Competition, status: string) {
    const res = await fetch(`/api/sport/competitions/${c.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data?.error || "Échec")
    toast.success(status === "OPEN" ? "Inscriptions ouvertes" : status === "CLOSED" ? "Compétition clôturée" : "Statut mis à jour")
    load()
  }

  async function launchCompetition(c: Competition) {
    if (!confirm(`Lancer officiellement la compétition « ${c.name} » ? Les inscriptions seront closes.`)) return
    const res = await fetch(`/api/sport/competitions/${c.id}/launch`, { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data?.error || "Échec")
    toast.success(`Compétition « ${c.name} » lancée officiellement`)
    load()
  }

  async function removeCompetition(c: Competition) {
    if (!confirm(`Supprimer la compétition « ${c.name} » ?`)) return
    const res = await fetch(`/api/sport/competitions/${c.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Compétition supprimée"); load() }
    else toast.error(data?.error || "Échec de la suppression")
  }

  async function setDelegateStatus(d: Delegate, status: string) {
    const res = await fetch(`/api/sport/delegates/${d.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data?.error || "Échec")
    toast.success(status === "ACTIVE" ? "Responsable validé" : "Responsable révoqué")
    load()
  }

  async function removeDelegate(d: Delegate) {
    if (!confirm("Retirer ce responsable sportif ?")) return
    const res = await fetch(`/api/sport/delegates/${d.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Responsable retiré"); load() }
    else toast.error(data?.error || "Échec")
  }

  async function setTeamStatus(t: Team, status: string) {
    const res = await fetch(`/api/sport/teams/${t.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data?.error || "Échec")
    toast.success(
      status === "VALIDATED" ? `Équipe « ${t.name} » validée` :
      status === "REJECTED" ? `Équipe « ${t.name} » refusée` :
      status === "UNDER_REVIEW" ? `Équipe « ${t.name} » mise en vérification` :
      "Statut mis à jour"
    )
    load()
  }

  async function removeTeam(t: Team) {
    if (!confirm(`Retirer l'équipe « ${t.name} » ?`)) return
    const res = await fetch(`/api/sport/teams/${t.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Équipe retirée"); load() }
    else toast.error(data?.error || "Échec de la suppression")
  }

  async function removeParticipant(p: Participant) {
    if (!confirm(`Retirer le participant exceptionnel ${p.firstName} ${p.lastName} ?`)) return
    const res = await fetch(`/api/sport/participants/${p.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Participant retiré"); load() }
    else toast.error(data?.error || "Échec")
  }

  async function setRefereeStatus(r: Referee, status: string) {
    const res = await fetch(`/api/sport/referees/${r.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data?.error || "Échec")
    toast.success(status === "VALIDATED" ? "Arbitre validé" : "Arbitre révoqué")
    load()
  }

  async function removeReferee(r: Referee) {
    if (!confirm(`Retirer l'arbitre ${r.fullName} ?`)) return
    const res = await fetch(`/api/sport/referees/${r.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Arbitre retiré"); load() }
    else toast.error(data?.error || "Échec")
  }

  async function removeMatch(m: Match) {
    if (!confirm("Supprimer ce match ?")) return
    const res = await fetch(`/api/sport/matches/${m.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Match supprimé"); load() }
    else toast.error(data?.error || "Échec")
  }

  async function removeDiscipline(d: Discipline) {
    if (!confirm(`Supprimer la discipline « ${d.name} » ?`)) return
    const res = await fetch(`/api/sport/disciplines/${d.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Discipline supprimée"); load() }
    else toast.error(data?.error || "Échec de la suppression")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sport — Compétitions inter-classes"
        description={rsa
          ? "Autorité du responsable des sports de l'Amicale — compétitions, équipes, responsables de classe, arbitres"
          : "Consultation — les décisions sportives sont réservées au responsable des sports de l'Amicale"}
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
        <StatCard title="Compétitions" value={loading ? "…" : competitions.length} icon={Flag} loading={loading} hint={`${openComps.length} ouverte(s) aux inscriptions`} />
        <StatCard title="Équipes inscrites" value={loading ? "…" : teams.length} icon={Users} tone="info" loading={loading} hint="Une équipe par classe et par discipline" />
        <StatCard title="Équipes validées" value={loading ? "…" : validatedTeams.length} icon={ShieldCheck} tone="success" loading={loading} />
        <StatCard title="Arbitres validés" value={loading ? "…" : validatedReferees.length} icon={Medal} tone="warning" loading={loading} />
      </div>

      {!rsa && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0 mt-px" />
          <span>
            Mode consultation : les décisions sportives (validation des équipes, arbitres, équipes exceptionnelles,
            lancement) sont réservées au responsable des sports de l'Amicale, y compris pour le président.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-end">
        <div className="w-full sm:w-72 space-y-1.5">
          <Label className="text-xs font-medium">Compétition</Label>
          <Select value={compFilter} onValueChange={setCompFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les compétitions</SelectItem>
              {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="competitions">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="competitions" className="gap-2"><Flag className="h-4 w-4" /> Compétitions</TabsTrigger>
          <TabsTrigger value="teams" className="gap-2"><Users className="h-4 w-4" /> Équipes</TabsTrigger>
          <TabsTrigger value="delegates" className="gap-2"><ClipboardCheck className="h-4 w-4" /> Responsables</TabsTrigger>
          <TabsTrigger value="exceptional" className="gap-2"><UserPlus className="h-4 w-4" /> Exceptionnels</TabsTrigger>
          <TabsTrigger value="referees" className="gap-2"><Medal className="h-4 w-4" /> Arbitres</TabsTrigger>
          <TabsTrigger value="matches" className="gap-2"><CalendarDays className="h-4 w-4" /> Matchs</TabsTrigger>
          <TabsTrigger value="standings" className="gap-2"><Trophy className="h-4 w-4" /> Classements</TabsTrigger>
          <TabsTrigger value="disciplines" className="gap-2"><Dumbbell className="h-4 w-4" /> Disciplines</TabsTrigger>
        </TabsList>

        {/* ================= COMPÉTITIONS ================= */}
        <TabsContent value="competitions" className="mt-4">
          <SectionCard
            title="Compétitions"
            description="Créez, configurez, ouvrez les inscriptions puis lancez officiellement la compétition."
            actions={rsa && (
              <Button size="sm" className="gap-2" onClick={() => openCompetitionDialog(null)}>
                <Plus className="h-4 w-4" /> Nouvelle compétition
              </Button>
            )}
          >
            {loading ? (
              <LoadingState rows={4} />
            ) : competitions.length === 0 ? (
              <EmptyState
                icon={Flag}
                title="Aucune compétition"
                description="Créez la compétition inter-classes, définissez ses disciplines et les classes concernées."
                action={rsa && <Button onClick={() => openCompetitionDialog(null)} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle compétition</Button>}
              />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Compétition</TableHead>
                      <TableHead className="hidden lg:table-cell">Disciplines</TableHead>
                      <TableHead className="hidden md:table-cell">Classes</TableHead>
                      <TableHead className="hidden md:table-cell">Équipes</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitions.map((c) => {
                      const combos = parseClasses(c.classes)
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.academicYear ?? "—"}
                              {c.fee > 0 && ` · Engagement ${c.fee.toLocaleString("fr-FR")} FCFA`}
                              {c.startDate && ` · du ${formatDate(c.startDate)}`}
                              {c.endDate && ` au ${formatDate(c.endDate)}`}
                            </p>
                            {c.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {c.disciplines.length === 0 ? "—" : c.disciplines.map((d) => d.discipline.name).join(", ")}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {combos.length === 0 ? "—" : (
                              <div className="flex flex-wrap gap-1 max-w-[260px]">
                                {combos.slice(0, 4).map((cb) => (
                                  <Badge key={`${cb.className}-${cb.level}`} variant="outline" className="text-[10px]">{classLabel(cb.className, cb.level)}</Badge>
                                ))}
                                {combos.length > 4 && <Badge variant="outline" className="text-[10px]">+{combos.length - 4}</Badge>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{c._count?.teams ?? 0}</TableCell>
                          <TableCell><StatusBadge status={c.status} map={COMP_STATUS} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {rsa && c.status === "DRAFT" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ouvrir les inscriptions" onClick={() => setCompStatus(c, "OPEN")}>
                                  <Unlock className="h-4 w-4" />
                                </Button>
                              )}
                              {rsa && c.status === "OPEN" && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" title="Retour en préparation" onClick={() => setCompStatus(c, "DRAFT")}>
                                    <Lock className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Lancer officiellement la compétition" onClick={() => launchCompetition(c)}>
                                    <PlayCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {rsa && (c.status === "OPEN" || c.status === "LAUNCHED") && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Clôturer la compétition" onClick={() => setCompStatus(c, "CLOSED")}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {rsa && (c.status === "DRAFT" || c.status === "OPEN") && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCompetitionDialog(c)}><Pencil className="h-4 w-4" /></Button>
                              )}
                              {rsa && c.status === "DRAFT" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCompetition(c)}><Trash2 className="h-4 w-4" /></Button>
                              )}
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
        </TabsContent>

        {/* ================= ÉQUIPES ================= */}
        <TabsContent value="teams" className="mt-4">
          <SectionCard
            title="Équipes & validation"
            description="Workflow BROUILLON → SOUMISE → EN VÉRIFICATION → VALIDÉE / REFUSÉE. La validation finale appartient au responsable des sports."
            actions={rsa && (
              <Button size="sm" className="gap-2" onClick={() => openTeamDialog(null)}>
                <UserPlus className="h-4 w-4" /> Créer une équipe
              </Button>
            )}
          >
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Équipe, classe, capitaine, discipline…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {Object.entries(TEAM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <LoadingState rows={5} />
            ) : filteredTeams.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Aucune équipe"
                description="Les responsables sportifs de classe soumettent leurs équipes depuis l'espace membre, ou créez-en une."
                action={rsa && <Button onClick={() => openTeamDialog(null)} className="gap-2"><UserPlus className="h-4 w-4" /> Créer une équipe</Button>}
              />
            ) : (
              <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
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
                    {filteredTeams.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {t.kind === "EXCEPTIONAL" ? <Flag className="h-4 w-4 shrink-0 text-fuchsia-600" /> : <Trophy className="h-4 w-4 shrink-0 text-primary" />}
                            <div className="min-w-0">
                              <span className="font-medium">{t.name}</span>
                              {t.kind === "EXCEPTIONAL" && <Badge variant="outline" className="ml-2 text-[9px] text-fuchsia-700">Exceptionnelle</Badge>}
                              <p className="text-[10px] text-muted-foreground">{compOf(t)?.name ?? "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{classLabel(t.className, t.level)}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{t.discipline?.name ?? "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          <p>{t.captainName ?? "—"}</p>
                          {t.delegate && <p className="text-[10px] text-muted-foreground">resp. {t.delegate.firstName} {t.delegate.lastName}</p>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {t.playersDetails?.length || t.participantsDetails?.length
                            ? `${(t.playersDetails?.length ?? 0) + (t.participantsDetails?.length ?? 0)} joueur(s)`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} map={TEAM_STATUS} />
                          {(t.status === "REJECTED" || t.status === "RETURNED") && t.refusalReason && (
                            <p className={`text-[10px] max-w-[180px] line-clamp-2 mt-0.5 ${t.status === "RETURNED" ? "text-orange-600" : "text-rose-600"}`} title={t.refusalReason}>Motif : {t.refusalReason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Détails de l'équipe" onClick={() => openTeamDetail(t)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {rsa && (
                              <>
                                {["DRAFT", "SUBMITTED"].includes(t.status) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-600" title="Mettre en vérification" onClick={() => setTeamStatus(t, "UNDER_REVIEW")}>
                                    <ClipboardCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                {["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(t.status) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Valider définitivement" onClick={() => setTeamStatus(t, "VALIDATED")}>
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    {["SUBMITTED", "UNDER_REVIEW"].includes(t.status) && (
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600" title="Retourner pour correction (avec motif)" onClick={() => openRefuseDialog(t, "RETURN")}>
                                        <RotateCcw className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Refuser (avec motif)" onClick={() => openRefuseDialog(t, "REJECT")}>
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {t.status !== "VALIDATED" && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTeamDialog(t)}><Pencil className="h-4 w-4" /></Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTeam(t)}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ================= RESPONSABLES DE CLASSE ================= */}
        <TabsContent value="delegates" className="mt-4">
          <SectionCard
            title="Responsables sportifs de classe"
            description="Le responsable des sports désigne et valide un responsable par classe/niveau, choisi parmi les étudiants inscrits."
            actions={rsa && (
              <Button size="sm" className="gap-2" onClick={() => openDelegateDialog()}>
                <UserPlus className="h-4 w-4" /> Désigner un responsable
              </Button>
            )}
          >
            {loading ? (
              <LoadingState rows={4} />
            ) : filteredDelegates.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="Aucun responsable désigné" description="Désignez le responsable sportif de chaque classe/niveau concerné par la compétition." />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Classe / Niveau</TableHead>
                      <TableHead className="hidden md:table-cell">Compétition</TableHead>
                      <TableHead className="hidden lg:table-cell">Désigné le</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDelegates.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <p className="font-medium">{d.member ? `${d.member.firstName} ${d.member.lastName}` : "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{d.member?.matricule ?? d.memberId}</p>
                        </TableCell>
                        <TableCell><Badge variant="outline">{classLabel(d.className, d.level)}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{d.competition?.name ?? "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{formatDate(d.appointedAt)}</TableCell>
                        <TableCell><StatusBadge status={d.status} map={DELEGATE_STATUS} /></TableCell>
                        <TableCell className="text-right">
                          {rsa && (
                            <div className="flex items-center justify-end gap-1">
                              {d.status === "PENDING" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Valider le responsable" onClick={() => setDelegateStatus(d, "ACTIVE")}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              {d.status !== "REVOKED" ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Révoquer" onClick={() => setDelegateStatus(d, "REVOKED")}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Réactiver" onClick={() => setDelegateStatus(d, "ACTIVE")}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDelegate(d)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
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

        {/* ================= PARTICIPANTS EXCEPTIONNELS ================= */}
        <TabsContent value="exceptional" className="mt-4">
          <SectionCard
            title="Participants exceptionnels — Administration universitaire"
            description="Directeurs des études, responsables pédagogiques… autorisés à participer sans être étudiants. Enregistrés par le responsable des sports uniquement."
            actions={rsa && (
              <Button size="sm" className="gap-2" onClick={() => openParticipantDialog(null)}>
                <UserPlus className="h-4 w-4" /> Ajouter un participant
              </Button>
            )}
          >
            {loading ? (
              <LoadingState rows={3} />
            ) : filteredParticipants.length === 0 ? (
              <EmptyState icon={UserPlus} title="Aucun participant exceptionnel" description="Enregistrez les membres de l'administration universitaire autorisés à participer à la compétition." />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Participant</TableHead>
                      <TableHead className="hidden md:table-cell">Fonction</TableHead>
                      <TableHead className="hidden lg:table-cell">Contact</TableHead>
                      <TableHead className="hidden md:table-cell">Compétition</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParticipants.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.firstName} {p.lastName}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{p.function ?? "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {p.phone ?? ""}{p.phone && p.email ? " · " : ""}{p.email ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{competitions.find((c) => c.id === p.competitionId)?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {rsa && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openParticipantDialog(p)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeParticipant(p)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
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

        {/* ================= ARBITRES ================= */}
        <TabsContent value="referees" className="mt-4">
          <SectionCard
            title="Arbitres"
            description="Choix, validation et affectation des arbitres aux matchs — autorité exclusive du responsable des sports."
            actions={rsa && (
              <Button size="sm" className="gap-2" onClick={() => openRefereeDialog(null)}>
                <Medal className="h-4 w-4" /> Ajouter un arbitre
              </Button>
            )}
          >
            {loading ? (
              <LoadingState rows={3} />
            ) : filteredReferees.length === 0 ? (
              <EmptyState icon={Medal} title="Aucun arbitre" description="Sélectionnez les arbitres de la compétition et validez leur participation." />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Arbitre</TableHead>
                      <TableHead className="hidden md:table-cell">Compétition</TableHead>
                      <TableHead className="hidden lg:table-cell">Note</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReferees.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.fullName}</p>
                          {r.member && <p className="text-xs text-muted-foreground font-mono">{r.member.matricule}</p>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{r.competition?.name ?? "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{r.note ?? "—"}</TableCell>
                        <TableCell><StatusBadge status={r.status} map={REFEREE_STATUS} /></TableCell>
                        <TableCell className="text-right">
                          {rsa && (
                            <div className="flex items-center justify-end gap-1">
                              {r.status === "SELECTED" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Valider l'arbitre" onClick={() => setRefereeStatus(r, "VALIDATED")}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              {r.status !== "REVOKED" ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Révoquer" onClick={() => setRefereeStatus(r, "REVOKED")}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Réactiver" onClick={() => setRefereeStatus(r, "VALIDATED")}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeReferee(r)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
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

        {/* ================= MATCHS ================= */}
        <TabsContent value="matches" className="mt-4">
          <SectionCard
            title="Calendrier des matchs"
            description="Programmation des rencontres entre équipes validées, avec arbitre affecté."
            actions={rsa && (
              <Button size="sm" className="gap-2" onClick={() => openMatchDialog(null)} disabled={validatedTeams.length < 2}>
                <CalendarDays className="h-4 w-4" /> Programmer un match
              </Button>
            )}
          >
            {loading ? (
              <LoadingState rows={4} />
            ) : filteredMatches.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Aucun match programmé"
                description={validatedTeams.length < 2 ? "Il faut au moins 2 équipes validées dans une même discipline pour programmer un match." : "Programmez le premier match de la compétition."}
                action={rsa && <Button onClick={() => openMatchDialog(null)} className="gap-2" disabled={validatedTeams.length < 2}><CalendarDays className="h-4 w-4" /> Programmer un match</Button>}
              />
            ) : (
              <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Phase</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead className="hidden md:table-cell">Arbitre</TableHead>
                      <TableHead className="hidden lg:table-cell">Lieu</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.map((m) => {
                      const played = m.status === "PLAYED"
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDateTime(m.date)}
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
                            <p className="text-[10px] text-muted-foreground">{m.discipline?.name ?? "—"}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{m.referee?.fullName ?? "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{m.location ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1">
                              <StatusBadge status={m.status} map={MATCH_STATUS} />
                              {m.sheetStatus && m.sheetStatus !== "NONE" && (
                                <StatusBadge status={m.sheetStatus} map={SHEET_STATUS} />
                              )}
                            </div>
                            {m.sheetStatus === "CONFIRMED" && m.sheetNumber && (
                              <p className="mt-1 font-mono text-[10px] text-muted-foreground">Feuille n° {m.sheetNumber}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {rsa && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("gap-1.5 text-xs", m.sheetStatus === "CONFIRMED" ? "text-emerald-600" : "text-primary")}
                                  onClick={() => openSheetDialog(m)}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  {m.sheetStatus === "CONFIRMED" ? "Feuille" : m.sheetStatus === "DRAFT" ? "Feuille (brouillon)" : "Feuille de match"}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMatchDialog(m)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMatch(m)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            )}
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

        {/* ================= CLASSEMENTS ================= */}
        <TabsContent value="standings" className="mt-4">
          <SectionCard
            title="Classements & résultats officiels"
            description="Classements calculés uniquement à partir des feuilles de match confirmées par le responsable des sports. Publiés automatiquement dans l'application étudiante."
          >
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Compétition</Label>
                <Select value={standingsComp} onValueChange={(v) => { setStandingsComp(v); setStandingsDisc("ALL") }}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes</SelectItem>
                    {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Discipline</Label>
                <Select value={standingsDisc} onValueChange={setStandingsDisc} disabled={standingsComp === "ALL"}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes</SelectItem>
                    {(competitions.find((c) => c.id === standingsComp)?.disciplines ?? []).map((cd) => (
                      <SelectItem key={cd.disciplineId} value={cd.disciplineId}>{cd.discipline?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {standingsComp === "ALL" || standingsDisc === "ALL" ? (
              <EmptyState icon={Trophy} title="Sélectionnez une compétition et une discipline" description="Le classement est calculé automatiquement dès qu'une feuille de match est confirmée." />
            ) : standingsLoading ? (
              <LoadingState rows={4} />
            ) : standings.length === 0 ? (
              <EmptyState icon={Trophy} title="Aucune équipe classée" description="Aucune feuille de match confirmée pour cette discipline pour le moment." />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Équipe</TableHead>
                      <TableHead className="hidden sm:table-cell">Classe</TableHead>
                      <TableHead className="text-center">J</TableHead>
                      <TableHead className="text-center">G</TableHead>
                      <TableHead className="text-center">N</TableHead>
                      <TableHead className="text-center">P</TableHead>
                      <TableHead className="text-center hidden md:table-cell">BP</TableHead>
                      <TableHead className="text-center hidden md:table-cell">BC</TableHead>
                      <TableHead className="text-center">Diff</TableHead>
                      <TableHead className="text-right">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((r, i) => (
                      <TableRow key={r.teamId} className={i === 0 ? "bg-emerald-50/50 dark:bg-emerald-950/20" : undefined}>
                        <TableCell className="text-sm">
                          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                            i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                            i === 1 ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                            i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" :
                            "bg-muted text-muted-foreground")}>{i + 1}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{r.teamName}</span>
                          {r.points > 0 && (
                            <p className="text-[10px] text-muted-foreground">{r.won + r.drawn + r.lost === 0 ? "Aucun match joué" : ""}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{[r.className, r.level].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{r.played}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{r.won}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{r.drawn}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{r.lost}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums hidden md:table-cell">{r.goalsFor}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums hidden md:table-cell">{r.goalsAgainst}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</TableCell>
                        <TableCell className="text-right text-sm font-bold tabular-nums">{r.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ================= DISCIPLINES ================= */}
        <TabsContent value="disciplines" className="mt-4">
          <SectionCard
            title="Disciplines sportives"
            description="Disciplines proposées (football, basketball…) et taille des équipes. La gestion est réservée au responsable des sports."
            actions={rsa && (
              <Button size="sm" className="gap-2" onClick={() => openDisciplineDialog(null)}>
                <Plus className="h-4 w-4" /> Nouvelle discipline
              </Button>
            )}
          >
            {loading ? (
              <LoadingState rows={4} />
            ) : disciplines.length === 0 ? (
              <EmptyState icon={Dumbbell} title="Aucune discipline" description="Ajoutez les disciplines de la compétition." />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Discipline</TableHead>
                      <TableHead className="hidden sm:table-cell">Description</TableHead>
                      <TableHead>Règles d'équipe</TableHead>
                      <TableHead>Postes</TableHead>
                      <TableHead>Statut</TableHead>
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
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{d.description ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {d.minTeamSize != null || d.maxTeamSize != null
                            ? `${d.minTeamSize ?? d.teamSize} – ${d.maxTeamSize ?? d.teamSize} joueurs`
                            : `${d.teamSize} joueur(s)`}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {!d.positions?.length ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {d.positions.slice(0, 4).map((p) => (
                                <Badge key={p.id} variant="outline" className="text-[9px]">{p.name}</Badge>
                              ))}
                              {d.positions.length > 4 && <Badge variant="outline" className="text-[9px]">+{d.positions.length - 4}</Badge>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={d.active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}>
                            {d.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {rsa && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDisciplineDialog(d)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDiscipline(d)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
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

      {/* ===== Règlement ===== */}
      <SectionCard
        title="Règlement officiel — Compétition Sportive Inter-Classes"
        description={`Document officiel établi par la Commission Sportive (${UCAB_FULL_NAME}).`}
        actions={<Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">PDF</Badge>}
      >
        <div className="rounded-lg border overflow-hidden">
          <iframe src={`${PDF_URL}#toolbar=1&view=FitH`} title="Règlement sportif inter-classes" className="w-full h-[60vh] bg-muted" />
        </div>
      </SectionCard>

      <SectionCard title="Règlement intérieur — les 14 articles" description="Synthèse lisible du règlement. Le PDF ci-dessus fait foi." contentClassName="p-4">
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

      {/* ===== Dialogues ===== */}
      <CompetitionDialog open={compOpen} onOpenChange={setCompOpen} editing={compEditing} disciplines={disciplines} onSaved={load} />
      <DelegateDialog open={delegateOpen} onOpenChange={setDelegateOpen} competitions={competitions} delegates={delegates} compFilter={compFilter} onSaved={load} />
      <TeamDialog open={teamOpen} onOpenChange={setTeamOpen} editing={teamEditing} competitions={competitions} participants={participants} onSaved={load} />
      <RefuseDialog target={refuseTarget} mode={refuseMode} onClose={() => setRefuseTarget(null)} onSaved={load} />
      <TeamDetailDialog target={detailTarget} onClose={() => setDetailTarget(null)} />
      <RefereeDialog open={refereeOpen} onOpenChange={setRefereeOpen} editing={refereeEditing} competitions={competitions} compFilter={compFilter} onSaved={load} />
      <ParticipantDialog open={participantOpen} onOpenChange={setParticipantOpen} editing={participantEditing} competitions={competitions} compFilter={compFilter} onSaved={load} />
      <MatchDialog open={matchOpen} onOpenChange={setMatchOpen} editing={matchEditing} competitions={competitions} teams={teams} referees={referees} compFilter={compFilter} onSaved={load} />
      <MatchSheetDialog match={sheetTarget} onOpenChange={(v) => { if (!v) setSheetTarget(null) }} onSaved={load} />
      <DisciplineDialog open={discOpen} onOpenChange={setDiscOpen} editing={discEditing} onSaved={load} />
    </div>
  )
}

// ============================================================
// Dialogues
// ============================================================

function comboKey(className: string, level: string) {
  return `${className}|${level}`
}

function CompetitionDialog({ open, onOpenChange, editing, disciplines, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Competition | null
  disciplines: Discipline[]
  onSaved: () => void
}) {
  const [form, setForm] = useState({ name: "", description: "", academicYear: "", startDate: "", endDate: "", fee: "0" })
  const [classes, setClasses] = useState<string[]>([])
  const [discIds, setDiscIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        academicYear: editing.academicYear ?? "",
        startDate: editing.startDate ? editing.startDate.slice(0, 10) : "",
        endDate: editing.endDate ? editing.endDate.slice(0, 10) : "",
        fee: String(editing.fee ?? 0),
      })
      setClasses(parseClasses(editing.classes).map((c) => comboKey(c.className, c.level)))
      setDiscIds((editing.disciplines ?? []).map((d) => d.discipline.id))
    } else {
      setForm({ name: "", description: "", academicYear: "", startDate: "", endDate: "", fee: "0" })
      setClasses([])
      setDiscIds([])
    }
  }, [open, editing])

  function toggleClass(key: string) {
    setClasses((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))
  }
  function toggleDisc(id: string) {
    setDiscIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Le nom de la compétition est requis"); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        academicYear: form.academicYear.trim() || null,
        startDate: form.startDate ? new Date(form.startDate + "T00:00:00").toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate + "T00:00:00").toISOString() : null,
        fee: Number(form.fee) || 0,
        classes: classes.map((k) => {
          const [className, level] = k.split("|")
          return { className, level }
        }),
        disciplineIds: discIds,
      }
      const res = await fetch(editing ? `/api/sport/competitions/${editing.id}` : "/api/sport/competitions", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Compétition modifiée" : "Compétition créée")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier la compétition" : "Nouvelle compétition"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Compétition Sportive Inter-Classes" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Année universitaire</Label>
              <Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Début</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fin</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Participation financière (FCFA, art. 10)</Label>
              <Input type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Contexte, règlement spécifique…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Classes / niveaux concernés</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 max-h-40 overflow-y-auto scroll-thin rounded-lg border p-2 gap-1">
              {ALL_COMBOS.map((cb) => {
                const key = comboKey(cb.className, cb.level)
                return (
                  <label key={key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent rounded px-1.5 py-1">
                    <input type="checkbox" checked={classes.includes(key)} onChange={() => toggleClass(key)} className="h-3.5 w-3.5 rounded border-input" />
                    {classLabel(cb.className, cb.level)}
                  </label>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Disciplines de la compétition</Label>
            {disciplines.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune discipline — créez-en d'abord dans l'onglet Disciplines.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 max-h-40 overflow-y-auto scroll-thin rounded-lg border p-2 gap-1">
                {disciplines.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent rounded px-1.5 py-1">
                    <input type="checkbox" checked={discIds.includes(d.id)} onChange={() => toggleDisc(d.id)} className="h-3.5 w-3.5 rounded border-input" />
                    {d.name} <span className="text-muted-foreground">({d.teamSize})</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DelegateDialog({ open, onOpenChange, competitions, delegates, compFilter, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  competitions: Competition[]
  delegates: Delegate[]
  compFilter: string
  onSaved: () => void
}) {
  const [compId, setCompId] = useState("")
  const [combo, setCombo] = useState<ClassCombo | null>(null)
  const [students, setStudents] = useState<SimpleMember[]>([])
  const [memberId, setMemberId] = useState("")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCompId(compFilter !== "ALL" ? compFilter : competitions[0]?.id ?? "")
    setCombo(null)
    setMemberId("")
    setSearch("")
    setStudents([])
  }, [open, compFilter, competitions])

  const comp = competitions.find((c) => c.id === compId)
  const combos = comp ? parseClasses(comp.classes) : []
  const taken = delegates.filter((d) => d.competitionId === compId && d.status !== "REVOKED").map((d) => comboKey(d.className, d.level))
  const available = combos.filter((cb) => !taken.includes(comboKey(cb.className, cb.level)))

  useEffect(() => {
    if (!open || !compId || !combo) { setStudents([]); return }
    fetch(`/api/members?faculty=${encodeURIComponent(combo.className)}&level=${encodeURIComponent(combo.level || "AP")}&status=ACTIVE&limit=500`)
      .then((r) => r.json())
      .then((d) => setStudents(Array.isArray(d) ? d : []))
      .catch(() => setStudents([]))
  }, [open, compId, combo])

  const filtered = students.filter((s) =>
    !search || s.matricule.includes(search) || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    if (!compId) { toast.error("Choisissez une compétition"); return }
    if (!combo) { toast.error("Choisissez la classe / le niveau"); return }
    if (!memberId) { toast.error("Choisissez le membre à désigner"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/sport/delegates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId: compId, className: combo.className, level: combo.level, memberId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Responsable désigné — à valider")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>Désigner un responsable sportif de classe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Compétition *</Label>
            <Select value={compId} onValueChange={(v) => { setCompId(v); setCombo(null); setMemberId("") }}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Classe / Niveau *</Label>
            <Select value={combo ? comboKey(combo.className, combo.level) : ""} onValueChange={(v) => {
              const [className, level] = v.split("|")
              setCombo({ className, level })
              setMemberId("")
            }}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">Toutes les classes ont un responsable</p>
                ) : available.map((cb) => (
                  <SelectItem key={comboKey(cb.className, cb.level)} value={comboKey(cb.className, cb.level)}>{classLabel(cb.className, cb.level)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {comp && taken.length > 0 && (
              <p className="text-[10px] text-muted-foreground">Les classes déjà pourvues ne sont pas proposées (une seule délégation par classe).</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Membre (étudiant inscrit) *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Matricule ou nom…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="rounded-lg border max-h-48 overflow-y-auto scroll-thin">
              {!combo ? (
                <p className="p-3 text-xs text-muted-foreground text-center">Choisissez d'abord la classe</p>
              ) : filtered.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">Aucun étudiant actif dans cette classe</p>
              ) : filtered.slice(0, 30).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setMemberId(s.id)}
                  className={`w-full text-left p-2.5 border-b last:border-0 hover:bg-accent transition-colors ${memberId === s.id ? "bg-primary/10" : ""}`}
                >
                  <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{s.matricule}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Désignation…" : "Désigner"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TeamDialog({ open, onOpenChange, editing, competitions, participants, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Team | null
  competitions: Competition[]
  participants: Participant[]
  onSaved: () => void
}) {
  const [kind, setKind] = useState<"CLASS" | "EXCEPTIONAL">("CLASS")
  const [compId, setCompId] = useState("")
  const [discId, setDiscId] = useState("")
  const [combo, setCombo] = useState<ClassCombo | null>(null)
  const [name, setName] = useState("")
  const [captainId, setCaptainId] = useState("")
  const [playerIds, setPlayerIds] = useState<string[]>([])
  const [partIds, setPartIds] = useState<string[]>([])
  const [posMap, setPosMap] = useState<Record<string, string>>({})
  const [students, setStudents] = useState<SimpleMember[]>([])
  const [members, setMembers] = useState<SimpleMember[]>([])
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const comp = competitions.find((c) => c.id === compId)
  const compDiscs = comp?.disciplines?.map((d) => d.discipline) ?? []
  const combos = comp ? parseClasses(comp.classes) : []
  const discipline = compDiscs.find((d) => d.id === discId)
  const compParticipants = participants.filter((p) => p.competitionId === compId)
  const maxPlayers = discipline?.maxTeamSize ?? discipline?.teamSize ?? 99
  const minPlayers = discipline?.minTeamSize ?? discipline?.teamSize ?? 0
  const positionOptions = (discipline?.positions ?? []).map((p) => p.name)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setKind(editing.kind === "EXCEPTIONAL" ? "EXCEPTIONAL" : "CLASS")
      setCompId(editing.competitionId ?? "")
      setDiscId(editing.disciplineId)
      setCombo({ className: editing.className, level: editing.level })
      setName(editing.name)
      setCaptainId(editing.captainId ?? "")
      setPlayerIds(playersIdList(editing.players))
      setPartIds((editing.participantsDetails ?? []).map((p) => p.id))
      const pm: Record<string, string> = {}
      for (const p of editing.playersDetails ?? []) if ((p as PlayerDetail & { position?: string | null }).position) pm[p.id] = (p as PlayerDetail & { position?: string | null }).position ?? ""
      setPosMap(pm)
    } else {
      setKind("CLASS")
      setCompId("")
      setDiscId("")
      setCombo(null)
      setName("")
      setCaptainId("")
      setPlayerIds([])
      setPartIds([])
      setPosMap({})
    }
  }, [open, editing])

  useEffect(() => {
    if (!open || kind !== "CLASS" || !combo) { setStudents([]); return }
    fetch(`/api/members?faculty=${encodeURIComponent(combo.className)}&level=${encodeURIComponent(combo.level || "AP")}&status=ACTIVE&limit=500`)
      .then((r) => r.json())
      .then((d) => setStudents(Array.isArray(d) ? d : []))
      .catch(() => setStudents([]))
  }, [open, kind, combo])

  useEffect(() => {
    if (!open || kind !== "EXCEPTIONAL") { setMembers([]); return }
    fetch("/api/members?status=ACTIVE&limit=500")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => setMembers([]))
  }, [open, kind])

  function toggleId(id: string, list: string[], set: (v: string[]) => void, max: number) {
    if (list.includes(id)) {
      set(list.filter((x) => x !== id))
      setPosMap((prev) => { const n = { ...prev }; delete n[id]; return n })
    } else if (list.length < max) set([...list, id])
    else toast.error(`Maximum ${max} joueur(s) pour cette discipline`)
  }

  const filteredMembers = members.filter((m) =>
    !search || m.matricule.includes(search) || `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase())
  )
  const selected = (playerIds.length + partIds.length)

  async function save() {
    if (!compId) { toast.error("Choisissez une compétition"); return }
    if (!discId) { toast.error("Choisissez une discipline"); return }
    if (kind === "CLASS" && !combo) { toast.error("Choisissez la classe / le niveau"); return }
    if (selected === 0) { toast.error("Ajoutez au moins un joueur"); return }
    if (positionOptions.length && kind === "CLASS" && selected < minPlayers) {
      toast.error(`Il manque ${minPlayers - selected} joueur(s) — minimum requis : ${minPlayers}`)
      return
    }
    setSaving(true)
    try {
      const payload = {
        competitionId: compId,
        disciplineId: discId,
        kind,
        className: combo?.className ?? "",
        level: combo?.level ?? "",
        name: name.trim(),
        captainId: captainId || null,
        playerIds,
        participantIds: kind === "EXCEPTIONAL" ? partIds : [],
        positions: playerIds.length ? posMap : undefined,
      }
      const res = await fetch(editing ? `/api/sport/teams/${editing.id}` : "/api/sport/teams", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Équipe modifiée" : "Équipe créée")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier l'équipe" : "Créer une équipe"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!editing && (
            <div className="flex gap-2">
              <Button type="button" variant={kind === "CLASS" ? "default" : "outline"} size="sm" onClick={() => { setKind("CLASS"); setPartIds([]) }}>
                Équipe de classe
              </Button>
              <Button type="button" variant={kind === "EXCEPTIONAL" ? "default" : "outline"} size="sm" onClick={() => { setKind("EXCEPTIONAL"); setPlayerIds([]) }}>
                Équipe exceptionnelle
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Compétition *</Label>
              <Select value={compId} onValueChange={(v) => { setCompId(v); setDiscId(""); setCombo(null) }} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Discipline *</Label>
              <Select value={discId} onValueChange={(v) => { setDiscId(v); setCaptainId("") }} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {compDiscs.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">Aucune discipline dans cette compétition</p>
                  ) : compDiscs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.teamSize})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {kind === "CLASS" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Classe / Niveau *</Label>
                <Select value={combo ? comboKey(combo.className, combo.level) : ""} onValueChange={(v) => {
                  const [className, level] = v.split("|")
                  setCombo({ className, level })
                  setCaptainId("")
                }} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {combos.map((cb) => (
                      <SelectItem key={comboKey(cb.className, cb.level)} value={comboKey(cb.className, cb.level)}>{classLabel(cb.className, cb.level)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nom de l'équipe</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Laissez vide pour un nom automatique" />
            </div>
          </div>

          {kind === "CLASS" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Joueurs (étudiants de la classe) — {playerIds.length}/{maxPlayers}</Label>
              <div className="rounded-lg border max-h-48 overflow-y-auto scroll-thin">
                {!combo ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">Choisissez d'abord la classe</p>
                ) : students.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">Aucun étudiant actif dans cette classe</p>
                ) : students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-accent cursor-pointer text-sm">
                    <input type="checkbox" checked={playerIds.includes(s.id)} onChange={() => toggleId(s.id, playerIds, setPlayerIds, maxPlayers)} className="h-3.5 w-3.5 rounded border-input" />
                    <span className="flex-1 truncate">{s.firstName} {s.lastName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{s.matricule}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {kind === "EXCEPTIONAL" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Participants exceptionnels (administration universitaire) — {partIds.length}/{maxPlayers}</Label>
                <div className="rounded-lg border max-h-40 overflow-y-auto scroll-thin">
                  {compParticipants.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground text-center">Aucun participant exceptionnel enregistré — ajoutez-en dans l'onglet Exceptionnels.</p>
                  ) : compParticipants.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-accent cursor-pointer text-sm">
                      <input type="checkbox" checked={partIds.includes(p.id)} onChange={() => toggleId(p.id, partIds, setPartIds, maxPlayers)} className="h-3.5 w-3.5 rounded border-input" />
                      <span className="flex-1 truncate">{p.firstName} {p.lastName}</span>
                      <span className="text-[10px] text-muted-foreground">{p.function ?? ""}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Étudiants autorisés — {playerIds.length}/{maxPlayers}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un étudiant…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="rounded-lg border max-h-40 overflow-y-auto scroll-thin">
                  {filteredMembers.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground text-center">Aucun étudiant</p>
                  ) : filteredMembers.slice(0, 60).map((s) => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-accent cursor-pointer text-sm">
                      <input type="checkbox" checked={playerIds.includes(s.id)} onChange={() => toggleId(s.id, playerIds, setPlayerIds, maxPlayers)} className="h-3.5 w-3.5 rounded border-input" />
                      <span className="flex-1 truncate">{s.firstName} {s.lastName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{s.matricule}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {kind === "CLASS" && playerIds.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Postes des joueurs</Label>
              <div className="rounded-lg border divide-y divide-border">
                {playerIds.map((pid) => {
                  const m = students.find((s) => s.id === pid)
                  const label = m ? `${m.firstName} ${m.lastName}` : pid
                  return (
                    <div key={pid} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="flex-1 truncate text-sm">{label}</span>
                      {positionOptions.length ? (
                        <Select value={posMap[pid] ?? ""} onValueChange={(v) => setPosMap({ ...posMap, [pid]: v })}>
                          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Poste…" /></SelectTrigger>
                          <SelectContent>
                            {positionOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input className="h-8 w-44 text-xs" placeholder="Poste (ex. Gardien)" value={posMap[pid] ?? ""} onChange={(e) => setPosMap({ ...posMap, [pid]: e.target.value })} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Capitaine</Label>
            <Select value={captainId} onValueChange={setCaptainId}>
              <SelectTrigger><SelectValue placeholder="Parmi les joueurs…" /></SelectTrigger>
              <SelectContent>
                {[...playerIds.map((id) => {
                  const m = students.find((s) => s.id === id) ?? members.find((s) => s.id === id)
                  return m ? { id: m.id, label: `${m.firstName} ${m.lastName}` } : null
                }), ...partIds.map((id) => {
                  const p = compParticipants.find((x) => x.id === id)
                  return p ? { id: p.id, label: `${p.firstName} ${p.lastName}` } : null
                })].filter((x): x is { id: string; label: string } => !!x).map((x) => (
                  <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RefuseDialog({ target, mode, onClose, onSaved }: {
  target: Team | null
  mode: "REJECT" | "RETURN"
  onClose: () => void
  onSaved: () => void
}) {
  const isReturn = mode === "RETURN"
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (target) setReason("") }, [target])

  async function submit() {
    if (!target) return
    if (!reason.trim()) {
      toast.error(isReturn ? "Le motif de la correction est requis" : "Le motif du refus est requis — le responsable de classe doit pouvoir corriger")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/sport/teams/${target.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isReturn ? "RETURNED" : "REJECTED", refusalReason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(isReturn ? `Équipe « ${target.name} » retournée pour correction` : `Équipe « ${target.name} » refusée`)
      onClose()
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isReturn ? `Retourner l'équipe « ${target?.name} » pour correction` : `Refuser l'équipe « ${target?.name} »`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            {isReturn
              ? "Le motif sera transmis au responsable sportif de classe : il corrige puis soumet à nouveau l'équipe."
              : "Le motif sera transmis au responsable sportif de classe afin qu'il corrige puis soumette à nouveau."}
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{isReturn ? "Motif de la correction *" : "Motif du refus *"}</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. Le poste du joueur X manque, équipe incomplète…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant={isReturn ? "default" : "destructive"} onClick={submit} disabled={saving}>
            {saving ? "Envoi…" : isReturn ? "Retourner pour correction" : "Refuser l'équipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TeamDetailDialog({ target, onClose }: { target: Team | null; onClose: () => void }) {
  if (!target) return null
  const t = target
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{t.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} map={TEAM_STATUS} />
            {t.kind === "EXCEPTIONAL" && <Badge variant="outline" className="text-fuchsia-700">Équipe exceptionnelle</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoRow label="Classe" value={classLabel(t.className, t.level)} />
            <InfoRow label="Discipline" value={t.discipline?.name ?? "—"} />
            <InfoRow label="Capitaine" value={t.captainName ?? "—"} />
            <InfoRow label="Soumission" value={t.submittedAt ? formatDateTime(t.submittedAt) : "—"} />
            <InfoRow label="Validation" value={t.validatedAt ? formatDateTime(t.validatedAt) : "—"} />
          </div>
          {(t.status === "REJECTED" || t.status === "RETURNED") && t.refusalReason && (
            <div className={`rounded-lg border p-3 text-xs ${t.status === "RETURNED" ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"}`}>
              <p className="font-medium mb-1">{t.status === "RETURNED" ? "Motif de la correction demandée" : "Motif du refus"}</p>
              <p>{t.refusalReason}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Joueurs ({t.playersDetails?.length ?? 0})</p>
            <div className="space-y-1">
              {!t.playersDetails?.length ? (
                <p className="text-xs text-muted-foreground">Aucun joueur</p>
              ) : t.playersDetails.map((p) => {
                const pos = (p as PlayerDetail & { position?: string | null }).position
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-1.5 text-sm">
                    <div className="min-w-0">
                      <span className="truncate">{p.firstName} {p.lastName}</span>
                      {pos && <Badge variant="outline" className="ml-2 text-[9px]">{pos}</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{p.matricule}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {t.participantsDetails && t.participantsDetails.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Participants exceptionnels ({t.participantsDetails.length})</p>
              <div className="space-y-1">
                {t.participantsDetails.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-1.5 text-sm">
                    <span>{p.firstName} {p.lastName}</span>
                    <span className="text-[10px] text-muted-foreground">{p.function ?? ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {t.attachments && (t.attachments as { url: string; name: string }[]).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Pièces jointes ({(t.attachments as { url: string; name: string }[]).length})</p>
              <div className="space-y-1">
                {(t.attachments as { url: string; name: string }[]).map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 text-sm text-primary hover:bg-muted">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{a.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RefereeDialog({ open, onOpenChange, editing, competitions, compFilter, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Referee | null
  competitions: Competition[]
  compFilter: string
  onSaved: () => void
}) {
  const [compId, setCompId] = useState("")
  const [useMember, setUseMember] = useState(true)
  const [memberId, setMemberId] = useState("")
  const [fullName, setFullName] = useState("")
  const [note, setNote] = useState("")
  const [members, setMembers] = useState<SimpleMember[]>([])
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCompId(editing?.competitionId ?? (compFilter !== "ALL" ? compFilter : competitions[0]?.id ?? ""))
    setFullName(editing?.fullName ?? "")
    setMemberId(editing?.memberId ?? "")
    setUseMember(!!editing?.memberId)
    setNote(editing?.note ?? "")
    setSearch("")
  }, [open, editing, compFilter, competitions])

  useEffect(() => {
    if (!open) return
    fetch("/api/members?status=ACTIVE&limit=500")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => setMembers([]))
  }, [open])

  const filtered = members.filter((m) =>
    !search || m.matricule.includes(search) || `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    if (!compId) { toast.error("Choisissez une compétition"); return }
    if (useMember && !memberId) { toast.error("Choisissez le membre arbitre"); return }
    if (!useMember && !fullName.trim()) { toast.error("Le nom de l'arbitre est requis"); return }
    setSaving(true)
    try {
      const payload = { competitionId: compId, memberId: useMember ? memberId : null, fullName: fullName.trim(), note: note.trim() || null }
      const res = await fetch(editing ? `/api/sport/referees/${editing.id}` : "/api/sport/referees", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Arbitre mis à jour" : "Arbitre sélectionné — à valider")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier l'arbitre" : "Ajouter un arbitre"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Compétition *</Label>
            <Select value={compId} onValueChange={setCompId} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant={useMember ? "default" : "outline"} size="sm" onClick={() => setUseMember(true)}>Membre existant</Button>
            <Button type="button" variant={useMember ? "outline" : "default"} size="sm" onClick={() => setUseMember(false)}>Nom libre</Button>
          </div>
          {useMember ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Membre *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Matricule ou nom…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="rounded-lg border max-h-44 overflow-y-auto scroll-thin">
                {filtered.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">Aucun membre</p>
                ) : filtered.slice(0, 30).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMemberId(m.id)}
                    className={`w-full text-left p-2.5 border-b last:border-0 hover:bg-accent transition-colors ${memberId === m.id ? "bg-primary/10" : ""}`}
                  >
                    <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{m.matricule}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nom de l'arbitre *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nom et prénom" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Spécialité, disponibilités…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ParticipantDialog({ open, onOpenChange, editing, competitions, compFilter, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Participant | null
  competitions: Competition[]
  compFilter: string
  onSaved: () => void
}) {
  const [compId, setCompId] = useState("")
  const [form, setForm] = useState({ firstName: "", lastName: "", function: "", phone: "", email: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCompId(editing?.competitionId ?? (compFilter !== "ALL" ? compFilter : competitions[0]?.id ?? ""))
    setForm({
      firstName: editing?.firstName ?? "",
      lastName: editing?.lastName ?? "",
      function: editing?.function ?? "",
      phone: editing?.phone ?? "",
      email: editing?.email ?? "",
    })
  }, [open, editing, compFilter, competitions])

  async function save() {
    if (!compId) { toast.error("Choisissez une compétition"); return }
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error("Le nom et le prénom sont requis"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/sport/participants/${editing.id}` : "/api/sport/participants", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId: compId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Participant mis à jour" : "Participant exceptionnel ajouté")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le participant" : "Ajouter un participant exceptionnel"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Compétition *</Label>
            <Select value={compId} onValueChange={setCompId} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Prénom *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nom *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Fonction</Label>
            <Input value={form.function} onChange={(e) => setForm({ ...form, function: e.target.value })} placeholder="Directeur des études, Responsable pédagogique…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MatchDialog({ open, onOpenChange, editing, competitions, teams, referees, compFilter, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Match | null
  competitions: Competition[]
  teams: Team[]
  referees: Referee[]
  compFilter: string
  onSaved: () => void
}) {
  const [compId, setCompId] = useState("")
  const [discId, setDiscId] = useState("")
  const [teamAId, setTeamAId] = useState("")
  const [teamBId, setTeamBId] = useState("")
  const [refereeId, setRefereeId] = useState("")
  const [date, setDate] = useState("")
  const [location, setLocation] = useState("")
  const [phase, setPhase] = useState("POOL")
  const [status, setStatus] = useState("SCHEDULED")
  const [scoreA, setScoreA] = useState("")
  const [scoreB, setScoreB] = useState("")
  const [saving, setSaving] = useState(false)

  const comp = competitions.find((c) => c.id === compId)
  const compDiscs = comp?.disciplines?.map((d) => d.discipline) ?? []
  const discTeams = teams.filter((t) => t.competitionId === compId && t.disciplineId === discId && t.status === "VALIDATED")
  const compReferees = referees.filter((r) => r.competitionId === compId && r.status === "VALIDATED")

  useEffect(() => {
    if (!open) return
    if (editing) {
      setCompId(teams.find((t) => t.id === editing.teamAId)?.competitionId ?? "")
      setDiscId(editing.disciplineId)
      setTeamAId(editing.teamAId)
      setTeamBId(editing.teamBId)
      setRefereeId(editing.refereeId ?? "")
      setDate(isoToLocalInput(editing.date))
      setLocation(editing.location ?? "")
      setPhase(editing.phase)
      setStatus(editing.status)
      setScoreA(editing.scoreA === null || editing.scoreA === undefined ? "" : String(editing.scoreA))
      setScoreB(editing.scoreB === null || editing.scoreB === undefined ? "" : String(editing.scoreB))
    } else {
      setCompId(compFilter !== "ALL" ? compFilter : "")
      setDiscId("")
      setTeamAId("")
      setTeamBId("")
      setRefereeId("")
      setDate("")
      setLocation("")
      setPhase("POOL")
      setStatus("SCHEDULED")
      setScoreA("")
      setScoreB("")
    }
  }, [open, editing, teams, compFilter])

  async function save() {
    if (!compId) { toast.error("Choisissez une compétition"); return }
    if (!discId) { toast.error("Choisissez une discipline"); return }
    if (!teamAId || !teamBId) { toast.error("Choisissez les deux équipes"); return }
    if (teamAId === teamBId) { toast.error("Une équipe ne peut pas jouer contre elle-même"); return }
    if (!date) { toast.error("La date du match est requise"); return }
    setSaving(true)
    try {
      const payload = {
        disciplineId: discId,
        teamAId,
        teamBId,
        refereeId: refereeId || null,
        date: new Date(date).toISOString(),
        location: location || null,
        phase,
        status,
        scoreA: scoreA === "" ? null : Number(scoreA),
        scoreB: scoreB === "" ? null : Number(scoreB),
      }
      const res = await fetch(editing ? `/api/sport/matches/${editing.id}` : "/api/sport/matches", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Match modifié" : "Match programmé")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le match" : "Programmer un match"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">Compétition *</Label>
            <Select value={compId} onValueChange={(v) => { setCompId(v); setDiscId(""); setTeamAId(""); setTeamBId("") }}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">Discipline *</Label>
            <Select value={discId} onValueChange={(v) => { setDiscId(v); setTeamAId(""); setTeamBId("") }}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {compDiscs.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Équipe A *</Label>
            <Select value={teamAId} onValueChange={setTeamAId}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {discTeams.length === 0 ? <p className="px-2 py-2 text-xs text-muted-foreground">Aucune équipe validée</p> : discTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={t.id === teamBId}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Équipe B *</Label>
            <Select value={teamBId} onValueChange={setTeamBId}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {discTeams.length === 0 ? <p className="px-2 py-2 text-xs text-muted-foreground">Aucune équipe validée</p> : discTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={t.id === teamAId}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Arbitre</Label>
            <Select value={refereeId} onValueChange={setRefereeId}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {compReferees.map((r) => <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Date et heure *</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Lieu</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Terrain, salle…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Phase</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MATCH_PHASE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MATCH_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Score équipe A</Label>
            <Input type="number" min={0} placeholder="—" value={scoreA} onChange={(e) => setScoreA(e.target.value)} disabled={status !== "PLAYED"} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Score équipe B</Label>
            <Input type="number" min={0} placeholder="—" value={scoreB} onChange={(e) => setScoreB(e.target.value)} disabled={status !== "PLAYED"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MatchSheetDialog({ match, onOpenChange, onSaved }: {
  match: Match | null
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [sheet, setSheet] = useState<MatchSheet>(EMPTY_SHEET)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const confirmed = match?.sheetStatus === "CONFIRMED"

  useEffect(() => {
    if (!match) return
    setSheet(parseSheet(match.sheet))
  }, [match])

  const teamAName = match?.teamA?.name ?? "Équipe A"
  const teamBName = match?.teamB?.name ?? "Équipe B"

  function patchPlayer(team: "A" | "B", index: number, patch: Partial<SheetPlayer>) {
    const key = team === "A" ? "playersA" : "playersB"
    setSheet((s) => ({ ...s, [key]: s[key].map((p, i) => (i === index ? { ...p, ...patch } : p)) }))
  }
  function addPlayer(team: "A" | "B") {
    const key = team === "A" ? "playersA" : "playersB"
    setSheet((s) => ({ ...s, [key]: [...s[key], { name: "", number: null, goals: 0, cards: "NONE" }] }))
  }
  function removePlayer(team: "A" | "B", index: number) {
    const key = team === "A" ? "playersA" : "playersB"
    setSheet((s) => ({ ...s, [key]: s[key].filter((_, i) => i !== index) }))
  }

  const totalA = sheet.playersA.reduce((acc, p) => acc + (p.goals || 0), 0)
  const totalB = sheet.playersB.reduce((acc, p) => acc + (p.goals || 0), 0)
  const goalsOk = totalA === sheet.scoreA && totalB === sheet.scoreB

  async function saveDraft() {
    if (!match) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sport/matches/${match.id}/sheet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sheet),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Brouillon de la feuille enregistré")
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmSheet() {
    if (!match) return
    if (sheet.playersA.length === 0 || sheet.playersB.length === 0) {
      toast.error("La feuille doit contenir les joueurs des deux équipes")
      return
    }
    if (!goalsOk) {
      toast.error("Le total des buts doit correspondre au score de chaque équipe")
      return
    }
    if (!window.confirm("Confirmer officiellement la feuille de match ? Le score sera figé et le classement mis à jour.")) return
    setConfirming(true)
    try {
      const res = await fetch(`/api/sport/matches/${match.id}/sheet/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(`Feuille confirmée — n° ${data.sheetNumber ?? ""}`)
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  async function reopenSheet() {
    if (!match) return
    if (!window.confirm("Rouvrir la feuille pour correction ? Le match repassera « planifié » et le score sera dégelé jusqu'à re-confirmation.")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sport/matches/${match.id}/sheet/reopen`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Feuille rouverte pour correction")
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const cardBadge = (cards: string) => {
    if (cards === "YELLOW") return <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-700">🟨 J</span>
    if (cards === "DOUBLE_YELLOW") return <span className="rounded bg-amber-200 px-1 py-0.5 text-[9px] font-semibold text-amber-800">🟨🟨 2J</span>
    if (cards === "RED") return <span className="rounded bg-rose-100 px-1 py-0.5 text-[9px] font-semibold text-rose-700">🟥 R</span>
    return null
  }

  const playersEditor = (team: "A" | "B", teamName: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{teamName} — joueurs</Label>
        {!confirmed && (
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => addPlayer(team)}>
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        )}
      </div>
      {(team === "A" ? sheet.playersA : sheet.playersB).length === 0 ? (
        <p className="rounded border border-dashed p-2 text-center text-[11px] text-muted-foreground">Ajoutez les joueurs de {teamName}</p>
      ) : (
        <div className="space-y-1.5">
          {(team === "A" ? sheet.playersA : sheet.playersB).map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                className="h-8 flex-1 min-w-0"
                placeholder="Nom du joueur"
                value={p.name}
                disabled={confirmed}
                onChange={(e) => patchPlayer(team, i, { name: e.target.value })}
              />
              <Input
                className="h-8 w-12"
                type="number"
                min={0}
                placeholder="N°"
                value={p.number ?? ""}
                disabled={confirmed}
                onChange={(e) => patchPlayer(team, i, { number: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <Input
                className="h-8 w-14"
                type="number"
                min={0}
                placeholder="Buts"
                value={p.goals}
                disabled={confirmed}
                onChange={(e) => patchPlayer(team, i, { goals: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
              {confirmed ? (
                cardBadge(p.cards)
              ) : (
                <Select value={p.cards} onValueChange={(v) => patchPlayer(team, i, { cards: v })}>
                  <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARD_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {!confirmed && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removePlayer(team, i)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {!confirmed && (
        <p className="text-[10px] text-muted-foreground">
          {totalA} but(s) saisi(s) — score {sheet.scoreA}
        </p>
      )}
    </div>
  )

  return (
    <Dialog open={!!match} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Feuille de match{match?.sheetNumber ? ` n° ${match.sheetNumber}` : ""}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {teamAName} vs {teamBName} — {match ? formatDateTime(match.date) : ""}
          </p>
        </DialogHeader>

        {confirmed && match?.sheetConfirmedAt && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Feuille officiellement confirmée le {formatDateTime(match.sheetConfirmedAt)} — le score est figé et publié dans les classements.
          </div>
        )}
        {!confirmed && match?.sheetStatus === "DRAFT" && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <Unlock className="h-3.5 w-3.5 shrink-0" />
            Brouillon en cours — confirmez la feuille pour officialiser le score et mettre à jour le classement.
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Score {teamAName}</Label>
              <Input type="number" min={0} value={sheet.scoreA} disabled={confirmed} onChange={(e) => setSheet((s) => ({ ...s, scoreA: Math.max(0, Number(e.target.value) || 0) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Score {teamBName}</Label>
              <Input type="number" min={0} value={sheet.scoreB} disabled={confirmed} onChange={(e) => setSheet((s) => ({ ...s, scoreB: Math.max(0, Number(e.target.value) || 0) }))} />
            </div>
          </div>

          {playersEditor("A", teamAName)}
          {playersEditor("B", teamBName)}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Arbitre de la rencontre</Label>
            <Input value={sheet.refereeName} disabled={confirmed} placeholder="Nom de l'arbitre" onChange={(e) => setSheet((s) => ({ ...s, refereeName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Observations</Label>
            <Textarea rows={3} value={sheet.observations} disabled={confirmed} placeholder="Blessures, incidents, forfaits…" onChange={(e) => setSheet((s) => ({ ...s, observations: e.target.value }))} />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {confirmed ? (
            <Button variant="outline" className="gap-2" onClick={reopenSheet} disabled={saving}>
              <RotateCcw className="h-4 w-4" /> Rouvrir pour correction
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={saveDraft} disabled={saving || confirming}>
                {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
              </Button>
              <Button className="gap-2" onClick={confirmSheet} disabled={saving || confirming}>
                <CheckCircle2 className="h-4 w-4" />
                {confirming ? "Confirmation…" : "Confirmer la feuille officielle"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DisciplineDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Discipline | null
  onSaved: () => void
}) {
  const [form, setForm] = useState({ name: "", description: "", teamSize: "5", minTeamSize: "", maxTeamSize: "", active: true })
  const [positions, setPositions] = useState<string[]>([])
  const [posInput, setPosInput] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        teamSize: String(editing.teamSize),
        minTeamSize: editing.minTeamSize != null ? String(editing.minTeamSize) : "",
        maxTeamSize: editing.maxTeamSize != null ? String(editing.maxTeamSize) : "",
        active: editing.active,
      })
      setPositions((editing.positions ?? []).map((p) => p.name))
    } else {
      setForm({ name: "", description: "", teamSize: "5", minTeamSize: "", maxTeamSize: "", active: true })
      setPositions([])
    }
    setPosInput("")
  }, [open, editing])

  function addPosition() {
    const v = posInput.trim()
    if (!v) return
    if (positions.includes(v)) { setPosInput(""); return }
    setPositions([...positions, v])
    setPosInput("")
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Le nom de la discipline est requis"); return }
    const min = form.minTeamSize ? Number(form.minTeamSize) : null
    const max = form.maxTeamSize ? Number(form.maxTeamSize) : null
    if (min !== null && max !== null && min > max) { toast.error("Le minimum ne peut pas dépasser le maximum"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/sport/disciplines/${editing.id}` : "/api/sport/disciplines", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, minTeamSize: min, maxTeamSize: max, positions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Discipline modifiée" : "Discipline créée")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier la discipline" : "Nouvelle discipline"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nom *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Football" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Taille référence</Label>
              <Input type="number" min={1} value={form.teamSize} onChange={(e) => setForm({ ...form, teamSize: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Min joueurs</Label>
              <Input type="number" min={1} placeholder="= taille" value={form.minTeamSize} onChange={(e) => setForm({ ...form, minTeamSize: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Max joueurs</Label>
              <Input type="number" min={1} placeholder="= taille" value={form.maxTeamSize} onChange={(e) => setForm({ ...form, maxTeamSize: e.target.value })} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">Règles de composition : laissez Min/Max vides pour exiger la taille exacte de la discipline.</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Postes configurables (optionnel)</Label>
            <div className="flex gap-2">
              <Input value={posInput} onChange={(e) => setPosInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPosition() } }} placeholder="Ex. Gardien" />
              <Button type="button" variant="outline" size="sm" onClick={addPosition} className="shrink-0">Ajouter</Button>
            </div>
            {positions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {positions.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs">
                    {p}
                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setPositions(positions.filter((x) => x !== p))}>×</button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Si des postes sont définis, le responsable de classe devra choisir l'un d'eux pour chaque joueur (ex. football : Gardien, Défenseur, Milieu, Attaquant).</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input id="disc-active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-input" />
            <Label htmlFor="disc-active" className="text-xs font-medium">Discipline active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
