import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { normalizeFiliere, normalizeLevel } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const status = url.searchParams.get("status")
  const faculty = url.searchParams.get("faculty")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status
  if (faculty && faculty !== "ALL") where.faculty = faculty
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { matricule: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ]
  }

  const members = await db.member.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { payments: true } } },
  })
  return ok(serialize(members))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { firstName, lastName, sex, birthDate, phone, email, address, faculty, department, level, academicYear, status } = body
  if (!firstName || !lastName) return err("Le nom et le prénom sont requis", 422)

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
      phone, email, address,
      faculty: normalizeFiliere(faculty),
      department,
      level: normalizeLevel(level),
      academicYear: year,
      status: status || "ACTIVE",
      qrCode: `SGIAU-${matricule}`,
    },
  })
  await audit({ action: "CREATE", entity: "Member", entityId: member.id, after: member, description: `Création membre ${member.matricule}` })
  return ok(serialize(member), 201)
}
