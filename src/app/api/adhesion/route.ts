import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { normalizeFiliere, normalizeLevel, isAP, birthDateError } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const status = url.searchParams.get("status")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status
  if (q) {
    where.member = {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { matricule: { contains: q } },
        { email: { contains: q } },
      ],
    }
  }

  const items = await db.adhesion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { member: true },
  })

  const counts = {
    PENDING: 0,
    SG_APPROVED: 0,
    PRESIDENT_APPROVED: 0,
    REFUSED: 0,
  }
  for (const a of items) {
    const k = a.status as keyof typeof counts
    if (k in counts) counts[k]++
  }

  return ok({ items: serialize(items), counts })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { firstName, lastName, sex, birthDate, phone, email, faculty, department, level, academicYear } = body
  if (!firstName || !lastName) return err("Le nom et le prénom sont requis", 422)
  const bdError = birthDateError(birthDate)
  if (bdError) return err(bdError, 422)

  const normalizedFaculty = normalizeFiliere(faculty)
  // L'Année Préparatoire est une filière sans niveau
  const normalizedLevel = isAP(normalizedFaculty) ? null : normalizeLevel(level)
  const userId = await getCurrentUserId()
  const year = academicYear || new Date().getFullYear().toString()
  const count = await db.member.count()
  const seq = count + 1
  const matricule = `${year}-${String(seq).padStart(4, "0")}`

  const member = await db.member.create({
    data: {
      matricule,
      firstName, lastName,
      sex: sex || "M",
      birthDate: birthDate ? new Date(birthDate) : null,
      phone, email,
      faculty: normalizedFaculty, department, level: normalizedLevel,
      academicYear: year,
      status: "PENDING",
      qrCode: `SGIAU-${matricule}`,
    },
  })

  const adhesion = await db.adhesion.create({
    data: {
      memberId: member.id,
      form: JSON.stringify({ firstName, lastName, sex, birthDate, phone, email, faculty: normalizedFaculty, department, level: normalizedLevel, academicYear }),
      status: "PENDING",
    },
    include: { member: true },
  })

  await audit({
    userId, action: "CREATE", entity: "Adhesion", entityId: adhesion.id,
    after: serialize(adhesion), description: `Nouvelle demande d'adhésion pour ${member.matricule}`,
  })

  return ok(serialize(adhesion), 201)
}
