import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { DEFAULT_INITIAL_PASSWORD, hashPassword } from "@/lib/sgiau/auth"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await db.adhesion.findUnique({
    where: { id },
    include: { member: true },
  })
  if (!item) return err("Adhésion introuvable", 404)
  return ok(serialize(item))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { action, reason } = body as { action: "approve_sg" | "approve_president" | "refuse"; reason?: string }
  const userId = await getCurrentUserId()

  const before = await db.adhesion.findUnique({ where: { id }, include: { member: true } })
  if (!before) return err("Adhésion introuvable", 404)

  if (action === "approve_sg") {
    if (before.status !== "PENDING") return err("Statut incompatible", 422)
    const after = await db.adhesion.update({
      where: { id },
      data: { status: "SG_APPROVED", sgValidatedById: userId, sgValidatedAt: new Date() },
      include: { member: true },
    })
    await audit({ userId, action: "VALIDATE", entity: "Adhesion", entityId: id, before: serialize(before), after: serialize(after), description: `Adhésion ${before.member.matricule} validée par le secrétaire` })
    return ok(serialize(after))
  }

  if (action === "approve_president") {
    if (before.status !== "SG_APPROVED") return err("L'adhésion doit d'abord être validée par le secrétaire", 422)

    const after = await db.adhesion.update({
      where: { id },
      data: { status: "PRESIDENT_APPROVED", presidentValidatedById: userId, presidentValidatedAt: new Date() },
      include: { member: true },
    })

    await db.member.update({ where: { id: before.memberId }, data: { status: "ACTIVE" } })

    const existingCard = await db.memberCard.findUnique({ where: { memberId: before.memberId } })
    if (!existingCard) {
      const cardNumber = `C-${before.member.matricule}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      await db.memberCard.create({
        data: {
          cardNumber,
          memberId: before.memberId,
          qrCode: before.member.qrCode ?? `SGIAU-${before.member.matricule}`,
          status: "ACTIVE",
          expiryDate: new Date(new Date().getFullYear() + 1, 11, 31),
        },
      })
    }

    const existing = await db.user.findUnique({ where: { memberId: before.memberId } })
    if (!existing) {
      await db.user.create({
        data: {
          username: before.member.matricule,
          email: before.member.email ?? `${before.member.matricule}@sgiau.local`,
          passwordHash: await hashPassword(DEFAULT_INITIAL_PASSWORD),
          fullName: `${before.member.firstName} ${before.member.lastName}`,
          role: "MEMBER",
          isActive: true,
          memberId: before.memberId,
        },
      })
    }

    await audit({ userId, action: "VALIDATE", entity: "Adhesion", entityId: id, before: serialize(before), after: serialize(after), description: `Adhésion ${before.member.matricule} approuvée par le président — membre activé, carte créée, compte utilisateur créé` })
    return ok(serialize(after))
  }

  if (action === "refuse") {
    const after = await db.adhesion.update({
      where: { id },
      data: { status: "REFUSED", refusalReason: reason || "Refus sans motif" },
      include: { member: true },
    })
    await audit({ userId, action: "VALIDATE", entity: "Adhesion", entityId: id, before: serialize(before), after: serialize(after), description: `Adhésion ${before.member.matricule} refusée — ${reason || "sans motif"}` })
    return ok(serialize(after))
  }

  return err("Action inconnue", 422)
}
