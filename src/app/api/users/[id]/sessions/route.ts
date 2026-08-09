import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize, requireAdmin } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin()
  if (gate.error) return err(gate.error === 401 ? "Non authentifié" : "Accès réservé aux administrateurs", gate.error)
  const { id } = await params
  const user = await db.user.findUnique({ where: { id } })
  if (!user) return err("Utilisateur introuvable", 404)
  const sessions = await db.sessionLog.findMany({
    where: { userId: id },
    orderBy: { loginAt: "desc" },
    take: 50,
  })
  return ok(serialize(sessions))
}
