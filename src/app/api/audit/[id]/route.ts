import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize, requireAdmin } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin()
  if (gate.error) return err(gate.error === 401 ? "Non authentifié" : "Accès réservé aux administrateurs", gate.error)
  const { id } = await params
  const item = await db.auditLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, fullName: true, username: true } } },
  })
  if (!item) return err("Entrée d'audit introuvable", 404)
  let before = null
  let after = null
  try { before = item.beforeData ? JSON.parse(item.beforeData) : null } catch { before = item.beforeData }
  try { after = item.afterData ? JSON.parse(item.afterData) : null } catch { after = item.afterData }
  return ok(serialize({ ...item, before, after }))
}
