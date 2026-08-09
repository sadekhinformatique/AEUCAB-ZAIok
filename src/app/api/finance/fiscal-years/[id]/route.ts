import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// PATCH — close fiscal year (set closed=true, closedAt)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getCurrentUserId()
  const body = await req.json().catch(() => ({}))

  const before = await db.fiscalYear.findUnique({ where: { id } })
  if (!before) return err("Exercice introuvable", 404)
  if (before.closed) return err("Cet exercice est déjà clôturé", 409)

  const after = await db.fiscalYear.update({
    where: { id },
    data: { closed: true, closedAt: new Date() },
  })

  await audit({ userId, action: "CLOSE", entity: "FiscalYear", entityId: id, before: serialize(before), after: serialize(after), description: `Exercice ${before.name} clôturé${body.note ? ` — ${body.note}` : ""}` })
  return ok(serialize(after))
}
