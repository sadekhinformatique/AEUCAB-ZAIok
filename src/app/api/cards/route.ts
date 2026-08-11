import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const status = url.searchParams.get("status")

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status
  if (q) {
    where.OR = [
      { cardNumber: { contains: q } },
      { member: { firstName: { contains: q } } },
      { member: { lastName: { contains: q } } },
      { member: { matricule: { contains: q } } },
    ]
  }

  const cards = await db.memberCard.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true, birthDate: true, email: true, phone: true, qrCode: true, sex: true } } },
  })
  return ok(serialize(cards))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const memberId = body.memberId
  if (!memberId) return err("Le membre est requis", 422)

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return err("Membre introuvable", 404)

  const existing = await db.memberCard.findUnique({ where: { memberId } })
  if (existing) return err("Ce membre possède déjà une carte", 409)

  const year = new Date().getFullYear()
  const seq = (await db.memberCard.count()) + 1
  const cardNumber = `C${year}${String(seq).padStart(4, "0")}`

  // Expiry = end of current fiscal year (find latest open one, fallback Sept 30 of next academic year)
  const fy = await db.fiscalYear.findFirst({ where: { closed: false }, orderBy: { endDate: "desc" } })
  const expiryDate = fy ? new Date(fy.endDate) : new Date(year + 1, 8, 30)

  const card = await db.memberCard.create({
    data: {
      cardNumber,
      memberId,
      issueDate: new Date(),
      expiryDate,
      qrCode: member.qrCode ?? `SGIAU-CARD-${member.matricule}`,
      status: "ACTIVE",
    },
    include: { member: true },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "MemberCard", entityId: card.id, after: card, description: `Génération carte ${cardNumber} pour ${member.matricule}` })
  return ok(serialize(card), 201)
}
