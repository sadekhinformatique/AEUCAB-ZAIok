import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// POST — create cash movement (adjust balance if validated)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cashAccountId, type, amount, label, date, validated } = body
  if (!cashAccountId) return err("Le compte de caisse est requis", 422)
  if (!type || (type !== "IN" && type !== "OUT")) return err("Le type doit être IN ou OUT", 422)
  if (!amount || Number(amount) <= 0) return err("Le montant est invalide", 422)

  const userId = await getCurrentUserId()
  const amt = Number(amount)
  const mvDate = date ? new Date(date) : new Date()
  const isValidated = validated !== false

  const acc = await db.cashAccount.findUnique({ where: { id: cashAccountId } })
  if (!acc) return err("Compte de caisse introuvable", 404)

  const movement = await db.cashMovement.create({
    data: {
      cashAccountId,
      type,
      amount: amt,
      label: label || (type === "IN" ? "Entrée de caisse" : "Sortie de caisse"),
      date: mvDate,
      validated: isValidated,
    },
  })

  if (isValidated) {
    const delta = type === "IN" ? amt : -amt
    await db.cashAccount.update({ where: { id: cashAccountId }, data: { balance: { increment: delta } } })
  }

  await audit({ userId, action: "CREATE", entity: "CashMovement", entityId: movement.id, after: serialize(movement), description: `Mouvement de caisse ${type} ${amt} FCFA — ${label || ""}` })

  return ok(serialize(movement), 201)
}
