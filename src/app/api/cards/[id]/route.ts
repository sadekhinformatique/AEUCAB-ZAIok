import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await db.memberCard.findUnique({
    where: { id },
    include: { member: true },
  })
  if (!card) return err("Carte introuvable", 404)
  return ok(serialize(card))
}

// PUT = replace : mark old card as REPLACED + create a new one for the same member
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const before = await db.memberCard.findUnique({ where: { id }, include: { member: true } })
  if (!before) return err("Carte introuvable", 404)

  // If action=replace → mark old as REPLACED and create new card
  if (body.action === "replace" || body.replace) {
    await db.memberCard.update({ where: { id }, data: { status: "REPLACED" } })
    const year = new Date().getFullYear()
    const seq = (await db.memberCard.count()) + 1
    const cardNumber = `C${year}${String(seq).padStart(4, "0")}`
    const fy = await db.fiscalYear.findFirst({ where: { closed: false }, orderBy: { endDate: "desc" } })
    const expiryDate = fy ? new Date(fy.endDate) : new Date(year + 1, 8, 30)
    const newCard = await db.memberCard.create({
      data: {
        cardNumber,
        memberId: before.memberId,
        issueDate: new Date(),
        expiryDate,
        qrCode: before.member?.qrCode ?? `SGIAU-CARD-${before.member?.matricule}`,
        status: "ACTIVE",
      },
      include: { member: true },
    })
    const userId = await getCurrentUserId()
    await audit({ userId, action: "UPDATE", entity: "MemberCard", entityId: id, before, after: newCard, description: `Remplacement carte ${before.cardNumber} → ${cardNumber}` })
    return ok(serialize(newCard))
  }

  // Otherwise, simple field update (status, expiryDate…)
  const allowed = ["status", "expiryDate"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "expiryDate") data[k] = body[k] ? new Date(body[k]) : null
      else data[k] = body[k]
    }
  }
  const after = await db.memberCard.update({ where: { id }, data, include: { member: true } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "MemberCard", entityId: id, before, after, description: `Mise à jour carte ${before.cardNumber}` })
  return ok(serialize(after))
}
