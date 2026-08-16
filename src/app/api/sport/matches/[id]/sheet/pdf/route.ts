import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import PDFDocument from "pdfkit"
import { db } from "@/lib/db"
import { err } from "@/lib/sgiau/api"
import { getSessionUserId } from "@/lib/sgiau/auth"
import { UCAB_FULL_NAME, APP_NAME } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

/**
 * pdfkit charge ses métriques de polices standard (Helvetica.afm…) via
 * `__dirname + '/data/…'` — le bundler Next réécrit `__dirname` et ce chemin
 * devient invalide. Les fichiers AFM sont embarqués dans `public/pdfkit-data/`
 * (dev, standalone et Vercel) : on redirige les lectures .afm vers le bon
 * emplacement. Le patch est local à ce module (côté serveur).
 */
const originalReadFileSync = fs.readFileSync.bind(fs)
/** Résout un fichier du dossier public/ (dev, standalone et Vercel). */
function resolvePublicAsset(rel: string): string | null {
  const candidates = [
    path.join(process.cwd(), rel),
    path.join(process.cwd(), ".next", "standalone", rel),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}
function resolveAfmPath(base: string): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "pdfkit-data", base),
    path.join(process.cwd(), ".next", "standalone", "public", "pdfkit-data", base),
    path.join(process.cwd(), "node_modules", "pdfkit", "js", "data", base),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}
fs.readFileSync = ((filePath: any, ...args: any[]) => {
  if (typeof filePath === "string" && filePath.includes("/data/") && filePath.endsWith(".afm")) {
    const real = resolveAfmPath(path.basename(filePath))
    if (real) return originalReadFileSync(real, ...args)
  }
  return originalReadFileSync(filePath, ...args)
}) as typeof fs.readFileSync

const CARD_LABEL: Record<string, string> = {
  NONE: "",
  YELLOW: "Jaune",
  DOUBLE_YELLOW: "2× jaune",
  RED: "Rouge",
}

interface SheetPlayer { name?: string; number?: number | null; goals?: number; cards?: string }
interface Sheet { scoreA?: number; scoreB?: number; playersA?: SheetPlayer[]; playersB?: SheetPlayer[]; refereeName?: string; observations?: string }

function parseSheet(raw: unknown): Sheet {
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

const PHASE_LABEL: Record<string, string> = {
  POOL: "Poules", QUARTER: "Quart de finale", SEMI: "Demi-finale", FINAL: "Finale",
}

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(date)
}

function fmtDateOnly(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date)
}

/** En-tête institutionnel : logo de l'Amicale centré, puis nom de l'université. */
function drawHeader(doc: PDFKit.PDFDocument, competitionName: string) {
  // Logo embarqué (PNG) — ignoré proprement si le fichier est absent/illisible
  const logoPath = resolvePublicAsset("public/logo-aeucab.png")
  if (logoPath) {
    try {
      doc.image(fs.readFileSync(logoPath), (595.28 - 36) / 2, doc.y, { width: 36 })
      doc.moveDown(0.3)
    } catch {
      // l'en-tête continue sans logo
    }
  }
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#166534").text(UCAB_FULL_NAME, { align: "center" })
  doc.font("Helvetica").fontSize(9).fillColor("#374151").text(`${APP_NAME} — ${competitionName}`, { align: "center" })
}

/**
 * PDF imprimable de la feuille de match confirmée (numéro officiel, joueurs,
 * scores, cartons, signatures) — accessible à tout utilisateur authentifié
 * (SAS et application étudiante) : la feuille confirmée est une donnée publique.
 * GET /api/sport/matches/:id/sheet/pdf
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId()
  if (!uid) {
    return err("Non authentifié", 401)
  }

  const { id } = await params
  const match = await db.sportMatch.findUnique({
    where: { id },
    include: {
      discipline: true,
      teamA: { include: { competition: true } },
      teamB: true,
      referee: true,
    },
  })
  if (!match) return err("Match introuvable", 404)
  if (match.sheetStatus !== "CONFIRMED" || !match.sheetNumber) {
    return err("Seule une feuille de match confirmée possède une version officielle", 422)
  }

  const sheet = parseSheet(match.sheet)
  const teamAName = match.teamA?.name ?? "Équipe A"
  const teamBName = match.teamB?.name ?? "Équipe B"

  // Responsable des sports ayant officiellement confirmé la feuille (signature numérique)
  const confirmer = match.sheetConfirmedBy
    ? await db.user.findUnique({ where: { id: match.sheetConfirmedBy }, select: { fullName: true, username: true } })
    : null
  const confirmerName = confirmer?.fullName || confirmer?.username || "Responsable des sports de l'Amicale"

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 45, bottom: 45, left: 50, right: 50 },
    info: { Title: `Feuille de match ${match.sheetNumber} — ${teamAName} vs ${teamBName}` },
  })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))

  const W = 595.28
  let y = 40

  // ——— En-tête ———
  drawHeader(doc, match.teamA?.competition?.name ?? "Compétition inter-classes")
  y = doc.y + 8
  doc.moveTo(50, y).lineTo(W - 50, y).lineWidth(1.2).strokeColor("#166534").stroke()
  y += 14
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#111827").text("FEUILLE DE MATCH OFFICIELLE", { align: "center", width: W - 100 })
  doc.font("Helvetica").fontSize(10).fillColor("#374151").text("Ce document fait foi du déroulement officiel de la rencontre.", { align: "center", width: W - 100 })

  // Numéro de feuille (encadré)
  y = doc.y + 10
  doc.roundedRect(50, y, W - 100, 30, 4).fillAndStroke("#f0fdf4", "#166534")
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#166534").text(`N° ${match.sheetNumber}`, { align: "center", width: W - 100, lineGap: 6 })
  y = doc.y + 12

  // ——— Informations du match ———
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#166534").text("RENSEIGNEMENTS GÉNÉRAUX")
  doc.y = doc.y + 4
  const infoRows: [string, string][] = [
    ["Compétition", match.teamA?.competition?.name ?? "—"],
    ["Discipline", match.discipline?.name ?? "—"],
    ["Phase", PHASE_LABEL[match.phase] ?? match.phase],
    ["Date", fmtDate(match.date)],
    ["Lieu", match.location || "—"],
    ["Arbitre", sheet.refereeName || match.referee?.fullName || "—"],
  ]
  doc.font("Helvetica").fontSize(9).fillColor("#111827")
  const col1 = 60
  const col2 = 130
  const rowH = 14
  for (const [label, value] of infoRows) {
    doc.font("Helvetica-Bold").fillColor("#374151").text(label, col1, doc.y, { width: 70 })
    doc.font("Helvetica").fillColor("#111827").text(value, col2, doc.y - 12, { width: W - 130 - col2 })
    doc.moveDown(0.35)
  }
  y = doc.y + 4

  // ——— Score ———
  doc.moveTo(50, y).lineTo(W - 50, y).lineWidth(0.6).strokeColor("#d1d5db").stroke()
  y += 10
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#111827").text(teamAName, 50, y, { width: 200, align: "center" })
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#166534").text(`${sheet.scoreA} — ${sheet.scoreB}`, W / 2 - 50, y - 4, { width: 100, align: "center" })
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#111827").text(teamBName, W - 250, y, { width: 200, align: "center" })
  y = doc.y + 12

  // ——— Effectifs (2 colonnes) ———
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#166534").text("EFFECTIFS ET FEUILLE DE JEU")
  y = doc.y + 4
  const colW = (W - 100 - 20) / 2
  const leftX = 50
  const rightX = 50 + colW + 20

  const drawTeam = (x: number, title: string, players: SheetPlayer[]) => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827").text(title, x, y)
    const headerY = doc.y + 3
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#6b7280")
    doc.text("N°", x, headerY, { width: 20 })
    doc.text("Joueur", x + 20, headerY, { width: colW - 60 })
    doc.text("Buts", x + colW - 38, headerY, { width: 24, align: "center" })
    doc.text("Carton", x + colW - 14, headerY, { width: 14, align: "center" })
    let yy = headerY + 12
    doc.font("Helvetica").fillColor("#111827").fontSize(8.5)
    for (const p of players) {
      doc.text(p.number != null ? String(p.number) : "—", x, yy, { width: 20 })
      doc.text(p.name || "—", x + 20, yy, { width: colW - 60 })
      doc.text(String(Number(p.goals) || 0), x + colW - 38, yy, { width: 24, align: "center" })
      const card = CARD_LABEL[p.cards ?? "NONE"]
      doc.text(card ? (card === "Jaune" ? "J" : card === "2× jaune" ? "2J" : "R") : "", x + colW - 14, yy, { width: 14, align: "center" })
      doc.moveDown(0.34)
      yy = doc.y
    }
    if (!players.length) {
      doc.text("Aucun joueur renseigné", x, yy, { width: colW })
      doc.moveDown(0.34)
    }
    return doc.y
  }

  drawTeam(leftX, `ÉQUIPE A — ${teamAName}`, sheet.playersA ?? [])
  const midY = doc.y
  drawTeam(rightX, `ÉQUIPE B — ${teamBName}`, sheet.playersB ?? [])
  y = Math.max(midY, doc.y) + 6

  // ——— Observations ———
  doc.moveTo(50, y).lineTo(W - 50, y).lineWidth(0.6).strokeColor("#d1d5db").stroke()
  y += 8
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#166534").text("OBSERVATIONS")
  doc.font("Helvetica").fontSize(9).fillColor("#111827")
  const obs = sheet.observations || "Aucune observation."
  const obsHeight = doc.heightOfString(obs, { width: W - 100 })
  doc.rect(50, doc.y + 3, W - 100, Math.max(36, obsHeight + 12)).strokeColor("#d1d5db").stroke()
  doc.text(obs, 56, doc.y + 8, { width: W - 112 })

  // ——— Signatures ———
  y = Math.max(doc.y + 14, 640)
  doc.moveTo(50, y).lineTo(W - 50, y).lineWidth(0.6).strokeColor("#d1d5db").stroke()
  y += 12
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#166534").text("SIGNATURES")
  y = doc.y + 14
  const sigY = 690
  const sigW = (W - 100 - 30) / 2
  const sigLabels: [string, number][] = [
    [`Capitaine — ${teamAName}`, 50],
    [`Capitaine — ${teamBName}`, 50 + sigW + 30],
    ["Arbitre de la rencontre", 50],
    ["Responsable des sports de l'Amicale", 50 + sigW + 30],
  ]
  for (const [label, x] of sigLabels) {
    doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text(label, x, sigY, { width: sigW, align: "center" })
    doc.moveTo(x + 20, sigY + 34).lineTo(x + sigW - 20, sigY + 34).lineWidth(0.8).strokeColor("#374151").stroke()
    doc.font("Helvetica").fontSize(7).fillColor("#9ca3af").text("Nom, signature et cachet", x, sigY + 38, { width: sigW, align: "center" })
  }

  // ——— Confirmation officielle (signature numérique du responsable des sports) ———
  const confY = Math.max(sigY + 52, doc.y + 14)
  doc.roundedRect(50, confY, W - 100, 46, 4).fillAndStroke("#f0fdf4", "#166534")
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#166534").text("CONFIRMÉ PAR", 62, confY + 9, { width: 105 })
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#111827").text(confirmerName, 172, confY + 8, { width: W - 100 - 172 - 20 })
  doc.font("Helvetica").fontSize(8.5).fillColor("#374151")
  doc.text(`Le ${match.sheetConfirmedAt ? fmtDate(match.sheetConfirmedAt) : "date non renseignée"}`, 62, confY + 24, { width: W - 124 })
  doc.font("Helvetica").fontSize(7).fillColor("#9ca3af").text("Signature numérique — validation officielle enregistrée dans le système", 172, confY + 25, { width: W - 100 - 172 - 20 })

  // Pied de page
  doc.font("Helvetica").fontSize(7).fillColor("#9ca3af").text(
    `Feuille générée le ${fmtDateOnly(new Date())} — ${APP_NAME} · ${UCAB_FULL_NAME}`,
    50, 800, { width: W - 100, align: "center" }
  )

  doc.end()
  await new Promise<void>((resolve) => doc.on("end", () => resolve()))
  const buffer = Buffer.concat(chunks)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="feuille-${match.sheetNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
