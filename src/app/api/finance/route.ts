import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, serialize } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// GET — full finance payload: accounts (flat with parent), ledgerEntries, fiscalYears, balance (per account sums)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const fiscalYearId = url.searchParams.get("fiscalYearId")
  const accountId = url.searchParams.get("accountId")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "500"), 2000)

  const [accounts, fiscalYears] = await Promise.all([
    db.account.findMany({ orderBy: { code: "asc" }, include: { parent: { select: { code: true, name: true } } } }),
    db.fiscalYear.findMany({ orderBy: { startDate: "desc" } }),
  ])

  // Default fiscal year = first open
  const targetFyId = fiscalYearId || fiscalYears.find((f) => !f.closed)?.id || fiscalYears[0]?.id

  const ledgerWhere: Record<string, unknown> = {}
  if (targetFyId) ledgerWhere.fiscalYearId = targetFyId
  if (accountId) ledgerWhere.accountId = accountId

  const ledgerEntries = await db.ledgerEntry.findMany({
    where: ledgerWhere,
    orderBy: { date: "desc" },
    take: limit,
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
      fiscalYear: { select: { id: true, name: true } },
    },
  })

  // Balance per account (sum of debit/credit over the filtered ledger)
  const balanceMap = new Map<string, { accountId: string; code: string; name: string; type: string; debit: number; credit: number; solde: number }>()
  for (const e of ledgerEntries) {
    const key = e.accountId
    if (!balanceMap.has(key)) {
      balanceMap.set(key, { accountId: e.accountId, code: e.account.code, name: e.account.name, type: e.account.type, debit: 0, credit: 0, solde: 0 })
    }
    const row = balanceMap.get(key)!
    row.debit += e.debit
    row.credit += e.credit
  }
  for (const row of balanceMap.values()) {
    // For ASSET/EXPENSE accounts, solde = debit - credit ; for LIABILITY/EQUITY/REVENUE, solde = credit - debit
    row.solde = (row.type === "ASSET" || row.type === "EXPENSE") ? row.debit - row.credit : row.credit - row.debit
  }
  const balance = Array.from(balanceMap.values()).sort((a, b) => a.code.localeCompare(b.code))

  return ok(serialize({ accounts, ledgerEntries, fiscalYears, balance, currentFiscalYearId: targetFyId }))
}
