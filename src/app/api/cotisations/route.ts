import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { normalizeFiliere, normalizeLevel } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

// GET — cotisation types + recent payments
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const paymentsLimit = Math.min(parseInt(url.searchParams.get("paymentsLimit") || "50"), 500)

  const [types, payments] = await Promise.all([
    db.cotisationType.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { payments: true } } } }),
    db.payment.findMany({
      orderBy: { paymentDate: "desc" },
      take: paymentsLimit,
      include: {
        member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true } },
        cotisationType: { select: { id: true, name: true, kind: true, defaultAmount: true } },
        receipt: { select: { id: true, number: true, cancelledAt: true } },
      },
    }),
  ])

  return ok(serialize({ types, payments }))
}

// POST — create cotisation type
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, kind, defaultAmount, faculty, level, academicYear, isActive } = body
  if (!name || !kind) return err("Le nom et le type de cotisation sont requis", 422)

  const ct = await db.cotisationType.create({
    data: {
      name,
      kind,
      defaultAmount: Number(defaultAmount) || 0,
      faculty: normalizeFiliere(faculty),
      level: normalizeLevel(level),
      academicYear: academicYear || null,
      isActive: isActive !== false,
    },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "CotisationType", entityId: ct.id, after: ct, description: `Création type de cotisation « ${name} »` })
  return ok(serialize(ct), 201)
}
