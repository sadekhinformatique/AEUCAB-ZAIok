import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, serialize } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// GET — cash accounts (with balances) + recent movements
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500)
  const accountId = url.searchParams.get("accountId")

  const [accounts, movements] = await Promise.all([
    db.cashAccount.findMany({
      orderBy: { createdAt: "asc" },
      include: { account: { select: { id: true, code: true, name: true } } },
    }),
    db.cashMovement.findMany({
      where: accountId && accountId !== "ALL" ? { cashAccountId: accountId } : undefined,
      orderBy: { date: "desc" },
      take: limit,
      include: { cashAccount: { select: { id: true, name: true, currency: true } } },
    }),
  ])

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  return ok(serialize({ accounts, movements, totalBalance }))
}
