import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { seedDatabase } from "@/lib/sgiau/seed"
import { ok, err, requireAdmin } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

async function adminGate() {
  const gate = await requireAdmin()
  if (gate.error) return err(gate.error === 401 ? "Non authentifié" : "Accès réservé aux administrateurs", gate.error)
  return null
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return err("Le seed est désactivé en production", 403)
  }
  const denied = await adminGate()
  if (denied) return denied
  try {
    const body = await req.json().catch(() => ({}))
    const force = body?.force === true
    const result = await seedDatabase(force)
    return ok(result)
  } catch (e) {
    console.error(e)
    return err("Seed failed: " + (e as Error).message, 500)
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return err("Le seed est désactivé en production", 403)
  }
  const denied = await adminGate()
  if (denied) return denied
  const counts = {
    members: await db.member.count(),
    users: await db.user.count(),
    payments: await db.payment.count(),
    receipts: await db.receipt.count(),
    expenses: await db.expense.count(),
    activities: await db.activity.count(),
    meetings: await db.meeting.count(),
  }
  return ok({ counts })
}
