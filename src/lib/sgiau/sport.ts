/**
 * SGIAU — Logique métier partagée du module Sport (serveur).
 *
 * Workflow d'équipe : DRAFT → SUBMITTED → UNDER_REVIEW →
 *   VALIDATED | RETURNED (correction) | REJECTED (définitif).
 * Compétition      : DRAFT → OPEN → LAUNCHED → CLOSED.
 *
 * Règles de fond (règlement inter-classes) :
 *  - chaque joueur est un étudiant existant de la base (jamais saisi manuellement) ;
 *  - un joueur doit appartenir à la classe/niveau représentée (équipes de classe) ;
 *  - un joueur ne peut représenter qu'une seule équipe durant la compétition ;
 *  - le nombre de joueurs est encadré par la discipline (min/max, défaut = teamSize) ;
 *  - le poste de chaque joueur est obligatoire avant la soumission.
 */
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { notifyMember } from "@/lib/sgiau/api"

export const TEAM_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "VALIDATED", "RETURNED", "REJECTED"] as const
export type TeamStatus = (typeof TEAM_STATUSES)[number]

export const COMPETITION_STATUSES = ["DRAFT", "OPEN", "LAUNCHED", "CLOSED"] as const
export type CompetitionStatus = (typeof COMPETITION_STATUSES)[number]

export const DELEGATE_STATUSES = ["PENDING", "ACTIVE", "REVOKED"] as const
export type DelegateStatus = (typeof DELEGATE_STATUSES)[number]

export const REFEREE_STATUSES = ["SELECTED", "VALIDATED", "REVOKED"] as const
export type RefereeStatus = (typeof REFEREE_STATUSES)[number]

export const TEAM_KINDS = ["CLASS", "EXCEPTIONAL"] as const
export type TeamKind = (typeof TEAM_KINDS)[number]

export const EXCEPTIONAL_CLASS = "Exceptionnelle"

/** Statuts qui « consomment » un joueur pour la règle « un joueur = une équipe ». */
export const ACTIVE_TEAM_STATUSES: TeamStatus[] = ["SUBMITTED", "UNDER_REVIEW", "VALIDATED"]

/** Statuts que le responsable de classe peut modifier/corriger. */
export const DELEGATE_EDITABLE_STATUSES: TeamStatus[] = ["DRAFT", "RETURNED", "REJECTED"]

export interface TeamClassScope {
  className: string
  level: string
}

export function isAP(className: string): boolean {
  return className.trim().toUpperCase() === "AP"
}

/** Parse un JSON array (ou un tableau) de chaînes. */
export function parseIdArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean)
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const v = JSON.parse(trimmed)
      if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean)
    } catch {
      // pas du JSON — on considère une liste de noms (rétrocompat) → ids inconnus
      return []
    }
  }
  return []
}

export function stringifyIds(ids: string[]): string | null {
  const uniq = [...new Set(ids.map((s) => s.trim()).filter(Boolean))]
  return uniq.length ? JSON.stringify(uniq) : null
}

export function parseCompetitionClasses(value: string | null): TeamClassScope[] {
  if (!value) return []
  try {
    const v = JSON.parse(value)
    if (!Array.isArray(v)) return []
    return v.filter(
      (c: unknown): c is TeamClassScope =>
        !!c && typeof c === "object" && typeof (c as Record<string, unknown>).className === "string"
    )
  } catch {
    return []
  }
}

export function classLabel(className: string, level: string): string {
  return `${className}${level ? ` · ${level}` : ""}`
}

interface TeamLike {
  id?: string
  kind: string
  className: string
  level: string
  disciplineId?: string
  players: string[]
  participants: string[]
}

/**
 * Applique les règles de la compétition à une équipe.
 * Retourne un message d'erreur, ou null si tout est conforme.
 */
export async function checkTeamRules(opts: {
  team: TeamLike
  disciplineTeamSize: number
  competitionId: string
  teamId?: string
  /** true (défaut) : le nombre exact de joueurs est exigé (soumission/validation). */
  exactCount?: boolean
  /** Règles de composition configurables (null = taille exacte teamSize). */
  minPlayers?: number | null
  maxPlayers?: number | null
  /** postes par joueur (memberId → poste). */
  positions?: Record<string, string>
  /** true : chaque joueur doit avoir un poste (soumission). */
  requirePositions?: boolean
}): Promise<string | null> {
  const { team, disciplineTeamSize, competitionId, teamId } = opts
  const exactCount = opts.exactCount ?? true
  const min = opts.minPlayers ?? disciplineTeamSize
  const max = opts.maxPlayers ?? disciplineTeamSize
  const positions = opts.positions ?? {}

  const isExceptional = team.kind === "EXCEPTIONAL"
  const total = team.players.length + team.participants.length

  // ——— Nombre de joueurs encadré par la discipline (min/max) ———
  if (exactCount) {
    if (total < min) {
      return `Il manque ${min - total} joueur(s) — minimum requis : ${min}`
    }
    if (total > max) {
      return `Le nombre maximum de joueurs est dépassé (max ${max}) — retirez ${total - max} joueur(s)`
    }
  }
  if (!exactCount && total > max) {
    return `L'équipe ne peut pas dépasser ${max} joueur(s)`
  }

  // ——— Doublons au sein de l'équipe ———
  const dup = team.players.filter((p, i) => team.players.indexOf(p) !== i)
  if (dup.length) return "Un joueur ne peut pas apparaître deux fois dans la même équipe"

  if (isExceptional) {
    // Les équipes exceptionnelles n'ont pas de contrainte de classe : les
    // participants exceptionnels (administration universitaire…) sont inscrits
    // par le responsable des sports. On vérifie seulement l'existence des ids.
    const memberCount = team.players.length
      ? await db.member.count({ where: { id: { in: team.players } } })
      : 0
    if (memberCount !== team.players.length) return "Un joueur sélectionné n'existe pas dans la base"
    const participantCount = team.participants.length
      ? await db.sportExceptionalParticipant.count({ where: { id: { in: team.participants }, competitionId } })
      : 0
    if (participantCount !== team.participants.length) {
      return "Un participant exceptionnel sélectionné n'existe pas dans cette compétition"
    }
    return null
  }

  // ——— Appartenance à la classe / niveau (art. 2) ———
  if (!team.players.length) return "L'équipe n'a aucun joueur"
  const members = await db.member.findMany({ where: { id: { in: team.players } } })
  const byId = new Map(members.map((m) => [m.id, m]))
  for (const pid of team.players) {
    const m = byId.get(pid)
    if (!m) return "Un joueur sélectionné n'existe pas dans la base"
    if (m.status !== "ACTIVE") return `${m.firstName} ${m.lastName} n'est pas un membre actif`
    const levelOk = isAP(team.className) ? !m.level : m.level === team.level
    if (m.faculty !== team.className || !levelOk) {
      return `${m.firstName} ${m.lastName} n'est pas inscrit(e) dans la classe ${classLabel(team.className, team.level)}`
    }
  }

  // ——— Un joueur = une seule équipe durant la compétition (art. 2) ———
  // (filtre JSON impossible en base — on récupère les équipes actives puis on
  // compare les listes de joueurs en mémoire)
  const others = await db.sportTeam.findMany({
    where: {
      id: teamId ? { not: teamId } : undefined,
      competitionId,
      status: { in: ACTIVE_TEAM_STATUSES as unknown as string[] },
    },
    select: { id: true, name: true, players: true },
  })
  for (const other of others) {
    const otherPlayers = parseIdArray(other.players)
    for (const pid of team.players) {
      if (otherPlayers.includes(pid)) {
        const m = byId.get(pid)
        const who = m ? `${m.firstName} ${m.lastName}` : pid
        return `${who} est déjà inscrit(e) dans l'équipe « ${other.name} »`
      }
    }
  }

  // ——— Poste obligatoire pour chaque joueur (soumission) ———
  if (opts.requirePositions && team.players.length > 0 && team.disciplineId) {
    const positionNames = await getDisciplinePositions(team.disciplineId)
    for (const pid of team.players) {
      const pos = (positions[pid] ?? "").trim()
      if (!pos) {
        const m = byId.get(pid)
        const who = m ? `${m.firstName} ${m.lastName}` : pid
        return `Le poste du joueur ${who} n'est pas renseigné`
      }
      if (positionNames.length && !positionNames.includes(pos)) {
        const m = byId.get(pid)
        const who = m ? `${m.firstName} ${m.lastName}` : pid
        return `Le poste « ${pos} » de ${who} n'existe pas dans cette discipline (postes : ${positionNames.join(", ")})`
      }
    }
  }

  return null
}

export interface TeamAttachment {
  url: string
  name: string
  type?: string
  size?: number
}

/** Normalise une liste de pièces jointes d'équipe. */
export function parseAttachments(value: unknown): TeamAttachment[] {
  if (!Array.isArray(value)) return []
  const out: TeamAttachment[] = []
  for (const v of value) {
    if (!v || typeof v !== "object") continue
    const a = v as Record<string, unknown>
    if (typeof a.url !== "string" || !a.url.trim()) continue
    out.push({
      url: a.url.trim(),
      name: (a.name ? String(a.name) : a.url.split("/").pop() ?? a.url).slice(0, 200),
      type: typeof a.type === "string" ? a.type : undefined,
      size: typeof a.size === "number" ? a.size : undefined,
    })
  }
  return out
}

export function stringifyAttachments(attachments: TeamAttachment[]): string | null {
  return attachments.length ? JSON.stringify(attachments) : null
}

/** Postes configurés pour une discipline. */
export async function getDisciplinePositions(disciplineId: string): Promise<string[]> {
  const rows = await db.sportPosition.findMany({
    where: { disciplineId },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  })
  return rows.map((r) => r.name)
}

/** Normalise une liste de postes (chaînes non vides, uniques). */
export function parsePositionNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const v of value) {
    const s = String(v ?? "").trim()
    if (s && !out.includes(s)) out.push(s)
  }
  return out
}

/** Remplace les postes configurés d'une discipline (à l'intérieur d'une transaction). */
export async function syncDisciplinePositions(tx: Prisma.TransactionClient, disciplineId: string, names: string[]) {
  await tx.sportPosition.deleteMany({ where: { disciplineId } })
  if (names.length) {
    await tx.sportPosition.createMany({
      data: names.map((name) => ({ disciplineId, name })),
    })
  }
}

/** Postes des joueurs d'une équipe (memberId → { position, confirmed }). */
export async function getTeamPlayerPositions(teamId: string): Promise<Map<string, { position: string | null; confirmed: boolean }>> {
  const rows = await db.sportTeamPlayer.findMany({ where: { teamId } })
  return new Map(rows.map((r) => [r.memberId, { position: r.position, confirmed: r.confirmed }]))
}

/** Détails des joueurs/participants d'une équipe (ids → objets + postes). */
export async function withTeamDetails<T extends { id: string; players: string | null; participants: string | null; attachments?: string | null }>(team: T) {
  const playerIds = parseIdArray(team.players)
  const participantIds = parseIdArray(team.participants)
  const [members, participants, posMap] = await Promise.all([
    playerIds.length
      ? db.member.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true, status: true },
        })
      : Promise.resolve([]),
    participantIds.length
      ? db.sportExceptionalParticipant.findMany({ where: { id: { in: participantIds } } })
      : Promise.resolve([]),
    getTeamPlayerPositions(team.id),
  ])
  const memberMap = new Map<string, (typeof members)[number]>()
  for (const m of members) memberMap.set(m.id, m)
  const participantMap = new Map<string, (typeof participants)[number]>()
  for (const p of participants) participantMap.set(p.id, p)
  return {
    ...team,
    playersDetails: playerIds
      .map((id) => {
        const m = memberMap.get(id)
        if (!m) return undefined
        const pos = posMap.get(id)
        return { ...m, position: pos?.position ?? null, confirmed: pos?.confirmed ?? true }
      })
      .filter((m): m is NonNullable<typeof m> => !!m),
    participantsDetails: participantIds.map((id) => participantMap.get(id)).filter((p): p is NonNullable<typeof p> => !!p),
    positions: Object.fromEntries([...posMap.entries()]),
    attachments: parseAttachments(team.attachments),
  }
}

// ============================================================
// CLASSEMENTS & RÉSULTATS
// ============================================================

export interface StandingRow {
  teamId: string
  teamName: string
  className: string
  level: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

/**
 * Calcule le classement d'une discipline (matchs joués, victoires, nuls,
 * défaites, buts marqués/encaissés, différence, points 3/1/0).
 * Les équipes non validées sont ignorées ; un forfait (équipe absente) est
 * compté comme une défaite 0-3 par défaut via scoreForfeit.
 */
export async function computeStandings(opts: {
  competitionId: string
  disciplineId: string
  scoreForfeit?: number
}): Promise<StandingRow[]> {
  const { competitionId, disciplineId } = opts
  const scoreForfeit = opts.scoreForfeit ?? 3
  const teams = await db.sportTeam.findMany({
    where: { competitionId, disciplineId, status: "VALIDATED" },
    select: { id: true, name: true, className: true, level: true },
  })
  if (!teams.length) return []
  const rows = new Map<string, StandingRow>(
    teams.map((t) => [
      t.id,
      { teamId: t.id, teamName: t.name, className: t.className, level: t.level, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 },
    ])
  )
  // Seuls les matchs à la feuille officiellement confirmée (ou historiques sans feuille) comptent
  const matches = await db.sportMatch.findMany({
    where: { disciplineId, status: "PLAYED", sheetStatus: { in: ["CONFIRMED", "NONE"] } },
    select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true },
  })
  for (const m of matches) {
    const a = rows.get(m.teamAId)
    const b = rows.get(m.teamBId)
    if (!a || !b) continue
    const sa = m.scoreA ?? 0
    const sb = m.scoreB ?? 0
    a.played++; b.played++
    a.goalsFor += sa; a.goalsAgainst += sb
    b.goalsFor += sb; b.goalsAgainst += sa
    if (sa > sb) { a.won++; b.lost++; a.points += 3 }
    else if (sa < sb) { b.won++; a.lost++; b.points += 3 }
    else { a.drawn++; b.drawn++; a.points++; b.points++ }
  }
  for (const r of rows.values()) r.goalDiff = r.goalsFor - r.goalsAgainst
  return [...rows.values()].sort(
    (x, y) => y.points - x.points || y.goalDiff - x.goalDiff || y.goalsFor - x.goalsFor || x.teamName.localeCompare(y.teamName, "fr")
  )
}

// ============================================================
// SUSPENSIONS & SANCTIONS (accumulation de cartons)
// ============================================================

export const SANCTION_CARD_TYPES = ["YELLOW", "DOUBLE_YELLOW", "RED", "ACCUMULATION"] as const
export type SanctionCardType = (typeof SANCTION_CARD_TYPES)[number]

export const SANCTION_STATUSES = ["ACTIVE", "SERVED", "CANCELED"] as const
export type SanctionStatus = (typeof SANCTION_STATUSES)[number]

/** Types de cartons qui entraînent une suspension (visible par les équipes). */
export const SUSPENSION_CARD_TYPES: SanctionCardType[] = ["DOUBLE_YELLOW", "RED", "ACCUMULATION"]

export const DEFAULT_YELLOW_ACCUMULATION = 3

export function cardTypeLabel(type: string): string {
  switch (type) {
    case "YELLOW": return "Carton jaune"
    case "DOUBLE_YELLOW": return "Deuxième jaune"
    case "RED": return "Carton rouge"
    case "ACCUMULATION": return "Accumulation de cartons"
    default: return type
  }
}

export function sanctionStatusLabel(status: string): string {
  switch (status) {
    case "ACTIVE": return "Active"
    case "SERVED": return "Servie"
    case "CANCELED": return "Annulée"
    default: return status
  }
}

export interface SheetCardPlayer {
  name?: string | null
  number?: number | null
  goals?: number | null
  cards?: string | null
}

export interface SanctionToCreate {
  competitionId: string
  disciplineId: string
  teamId: string | null
  playerName: string
  memberId: string | null
  cardType: string
  matchId: string | null
  matchesSuspended: number
  reason: string | null
}

interface SanctionMatchLike {
  id: string
  competitionId?: string | null
  disciplineId: string
  teamAId: string | null
  teamBId: string | null
}

/**
 * Normalise un champ carton d'une feuille (« NONE » par défaut).
 */
export function normalizeCard(value: unknown): string {
  const v = String(value ?? "NONE").trim().toUpperCase()
  return (SANCTION_CARD_TYPES as readonly string[]).includes(v) ? v : "NONE"
}

/**
 * Détecte les sanctions à enregistrer à partir d'une feuille de match confirmée.
 *
 * Règles appliquées :
 *  - carton rouge → suspension de 1 match (DOUBLE_YELLOW idem) ;
 *  - accumulation de cartons jaunes (seuil de la discipline, défaut 3) → suspension.
 *
 * Les joueurs sont rattachés aux membres de l'équipe par correspondance de nom
 * (la feuille ne stocke que les noms). Retourne la liste des sanctions à créer.
 */
export async function detectSanctionsForSheet(opts: {
  match: SanctionMatchLike
  sheet: { playersA?: SheetCardPlayer[] | null; playersB?: SheetCardPlayer[] | null }
  yellowAccumulation?: number | null
  excludeMatchId?: boolean
}): Promise<SanctionToCreate[]> {
  const { match, sheet } = opts
  const threshold = opts.yellowAccumulation ?? DEFAULT_YELLOW_ACCUMULATION
  let competitionId = match.competitionId ?? ""
  if (!competitionId && match.teamAId) {
    // SportMatch ne porte pas la compétition — elle est déduite de l'équipe A
    const teamA0 = await db.sportTeam.findUnique({
      where: { id: match.teamAId },
      select: { competitionId: true },
    })
    competitionId = teamA0?.competitionId ?? ""
  }
  if (!competitionId || !match.teamAId || !match.teamBId) return []

  // Membre par nom de joueur, pour les deux équipes (la feuille ne stocke que des noms)
  const [teamA, teamB] = await Promise.all([
    db.sportTeam.findUnique({ where: { id: match.teamAId }, select: { id: true, players: true } }),
    db.sportTeam.findUnique({ where: { id: match.teamBId }, select: { id: true, players: true } }),
  ])
  const playerIdsA = teamA ? parseIdArray(teamA.players) : []
  const playerIdsB = teamB ? parseIdArray(teamB.players) : []
  const [membersA, membersB] = await Promise.all([
    playerIdsA.length ? db.member.findMany({ where: { id: { in: playerIdsA } }, select: { id: true, firstName: true, lastName: true } }) : Promise.resolve([]),
    playerIdsB.length ? db.member.findMany({ where: { id: { in: playerIdsB } }, select: { id: true, firstName: true, lastName: true } }) : Promise.resolve([]),
  ])
  const nameToMember = (members: { id: string; firstName: string; lastName: string }[]) => {
    const map = new Map<string, string>()
    for (const m of members) {
      map.set(`${m.firstName} ${m.lastName}`.toLowerCase().trim(), m.id)
      map.set(`${m.lastName} ${m.firstName}`.toLowerCase().trim(), m.id)
    }
    return map
  }
  const mapA = nameToMember(membersA)
  const mapB = nameToMember(membersB)

  // Nombre de cartons jaunes ACTIVE déjà enregistrés pour chaque joueur (compétition)
  const existingYellows = await db.sportSanction.findMany({
    where: { competitionId, cardType: "YELLOW", status: "ACTIVE" },
    select: { memberId: true, playerName: true },
  })
  const yellowCount = new Map<string, number>()
  for (const s of existingYellows) {
    const key = s.memberId ?? s.playerName.toLowerCase().trim()
    yellowCount.set(key, (yellowCount.get(key) ?? 0) + 1)
  }

  const out: SanctionToCreate[] = []
  const process = (list: SheetCardPlayer[] | null | undefined, teamId: string, memberMap: Map<string, string>) => {
    for (const p of list ?? []) {
      const card = normalizeCard(p?.cards)
      if (card === "NONE") continue
      const name = (p?.name ?? "").trim()
      if (!name) continue
      const memberId = memberMap.get(name.toLowerCase()) ?? null

      if (card === "YELLOW") {
        const key = memberId ?? name.toLowerCase().trim()
        const total = (yellowCount.get(key) ?? 0) + 1
        yellowCount.set(key, total)
        // Avertissement enregistré (suivi) — aucune suspension par lui-même
        out.push({
          competitionId, disciplineId: match.disciplineId, teamId, playerName: name, memberId,
          cardType: "YELLOW", matchId: match.id, matchesSuspended: 0, reason: "Carton jaune",
        })
        // Seuil d'accumulation atteint → suspension
        if (threshold > 0 && total % threshold === 0) {
          out.push({
            competitionId, disciplineId: match.disciplineId, teamId, playerName: name, memberId,
            cardType: "ACCUMULATION", matchId: match.id, matchesSuspended: 1,
            reason: `Accumulation de ${total} cartons jaunes (seuil : ${threshold})`,
          })
        }
      } else if (card === "DOUBLE_YELLOW") {
        out.push({
          competitionId, disciplineId: match.disciplineId, teamId, playerName: name, memberId,
          cardType: "DOUBLE_YELLOW", matchId: match.id, matchesSuspended: 1,
          reason: "Deuxième carton jaune dans le même match",
        })
      } else if (card === "RED") {
        out.push({
          competitionId, disciplineId: match.disciplineId, teamId, playerName: name, memberId,
          cardType: "RED", matchId: match.id, matchesSuspended: 1,
          reason: "Carton rouge",
        })
      }
    }
  }

  process(sheet.playersA, match.teamAId, mapA)
  process(sheet.playersB, match.teamBId, mapB)
  return out
}

/**
 * Applique les sanctions d'une feuille confirmée (création idempotente) et
 * notifie l'équipe concernée (responsable sportif + joueurs) pour chaque
 * suspension (matchsSuspended > 0). Retourne les sanctions créées.
 */
export async function applyMatchSanctions(opts: {
  match: SanctionMatchLike
  sheet: { playersA?: SheetCardPlayer[] | null; playersB?: SheetCardPlayer[] | null }
  yellowAccumulation?: number | null
}): Promise<{ created: number; suspended: number }> {
  const sanctions = await detectSanctionsForSheet(opts)
  if (!sanctions.length) return { created: 0, suspended: 0 }

  // Idempotence : si des sanctions existent déjà pour ce match (re-confirmation), on les remplace
  await db.sportSanction.deleteMany({ where: { matchId: opts.match.id } })
  await db.sportSanction.createMany({ data: sanctions })

  // Notifications pour les suspensions uniquement
  const suspensions = sanctions.filter((s) => s.matchesSuspended > 0)
  const teamIds = [...new Set(suspensions.map((s) => s.teamId).filter((t): t is string => !!t))]
  const competition = sanctions.length
    ? await db.sportCompetition.findUnique({
        where: { id: sanctions[0].competitionId },
        select: { id: true, name: true },
      })
    : null
  const teams = teamIds.length
    ? await db.sportTeam.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true, delegateId: true, teamPlayers: { select: { memberId: true } } },
      })
    : []
  for (const team of teams) {
    const teamSuspensions = suspensions.filter((s) => s.teamId === team.id)
    const memberIds = new Set<string>()
    if (team.delegateId) memberIds.add(team.delegateId)
    for (const tp of team.teamPlayers) memberIds.add(tp.memberId)
    for (const mid of memberIds) {
      const names = teamSuspensions.map((s) => s.playerName).join(", ")
      await notifyMember({
        memberId: mid,
        title: `Suspension — ${team.name}`,
        message: `${names} : ${teamSuspensions.length} sanction(s) (${teamSuspensions.map((s) => cardTypeLabel(s.cardType)).join(", ")}) — ${competition?.name ?? ""}`,
        type: "WARNING",
      })
    }
  }
  return { created: sanctions.length, suspended: suspensions.length }
}
