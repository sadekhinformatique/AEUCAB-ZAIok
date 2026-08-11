import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize } from "@/lib/sgiau/api"
import { normalizeFiliere, normalizeLevel, isAP } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await db.member.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, role: true, isActive: true } },
      adhesion: true,
      card: true,
      payments: { include: { cotisationType: true }, orderBy: { paymentDate: "desc" }, take: 50 },
      receipts: { orderBy: { createdAt: "desc" }, take: 30 },
      _count: { select: { payments: true, presences: true, activities: true, meetings: true, votes: true } },
    },
  })
  if (!member) return err("Membre introuvable", 404)
  return ok(serialize(member))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.member.findUnique({ where: { id } })
  if (!before) return err("Membre introuvable", 404)

  const allowed = ["firstName", "lastName", "sex", "birthDate", "phone", "email", "address", "faculty", "department", "level", "academicYear", "status", "photoUrl"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "birthDate") data[k] = body[k] ? new Date(body[k]) : null
      else if (k === "faculty") data[k] = normalizeFiliere(body[k])
      else if (k === "level") data[k] = normalizeLevel(body[k])
      else data[k] = body[k]
    }
  }
  // L'Année Préparatoire est une filière sans niveau
  const finalFaculty = "faculty" in body ? normalizeFiliere(body.faculty) : before.faculty
  if (isAP(finalFaculty)) data.level = null
  const after = await db.member.update({ where: { id }, data })
  await audit({ action: "UPDATE", entity: "Member", entityId: id, before, after, description: `Modification membre ${before.matricule}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.member.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, role: true } },
      _count: {
        select: {
          receipts: true,
          payments: true,
          votes: true,
          electionCands: true,
          borrows: true,
          presences: true,
          activities: true,
          meetings: true,
        },
      },
    },
  })
  if (!before) return err("Membre introuvable", 404)

  // Les relations Restrict (reçus, bulletins, candidatures, emprunts)
  // empêchent une suppression SQL — on les protège pour préserver la
  // comptabilité et l'intégrité des élections.
  const blockers: string[] = []
  if (before._count.receipts > 0) blockers.push(`${before._count.receipts} reçu(s)`)
  if (before._count.payments > 0) blockers.push(`${before._count.payments} paiement(s)`)
  if (before._count.votes > 0) blockers.push(`${before._count.votes} bulletin(s) de vote`)
  if (before._count.electionCands > 0) blockers.push(`${before._count.electionCands} candidature(s)`)
  if (before._count.borrows > 0) blockers.push(`${before._count.borrows} emprunt(s)`)
  if (blockers.length > 0) {
    return err(
      `Suppression impossible : le membre a ${blockers.join(", ")}. Passez-le au statut ARCHIVÉ pour le retirer des listes actives.`,
      409
    )
  }

  // Compte utilisateur lié (créé automatiquement à l'inscription) : on le
  // supprime avec le membre si c'est un compte membre ordinaire (MEMBER/CUSTOM).
  // Les comptes de bureau ou admin sont protégés — archivez le membre alors.
  let deletedAccount: string | null = null
  if (before.user) {
    const privileged = ["PRESIDENT", "SECRETAIRE", "TRESORIER", "CAISSIER", "COMMISSAIRE", "ADMIN_IT"]
    if (privileged.includes(before.user.role)) {
      return err(
        `Suppression impossible : le membre est lié au compte de bureau « ${before.user.username} ». Passez-le au statut ARCHIVÉ pour le retirer des listes actives.`,
        409
      )
    }
    try {
      await db.user.delete({ where: { id: before.user.id } })
      deletedAccount = before.user.username
    } catch {
      return err("Suppression impossible : compte utilisateur lié. Passez le membre au statut ARCHIVÉ.", 409)
    }
  }

  try {
    await db.member.delete({ where: { id } })
  } catch {
    return err("Suppression impossible : enregistrements liés. Passez le membre au statut ARCHIVÉ.", 409)
  }
  await audit({
    action: "DELETE",
    entity: "Member",
    entityId: id,
    before,
    description: `Suppression membre ${before.matricule}${deletedAccount ? ` (compte utilisateur ${deletedAccount} supprimé)` : ""}`,
  })
  return ok({ ok: true, deletedAccount })
}
