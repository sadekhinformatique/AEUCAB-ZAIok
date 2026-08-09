import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { genReference } from "@/lib/sgiau/format"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const status = url.searchParams.get("status")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { question: { contains: q } },
    ]
  }

  const votes = await db.vote.findMany({
    where,
    orderBy: { startDate: "desc" },
    take: limit,
    include: {
      options: { orderBy: { createdAt: "asc" } },
      _count: { select: { ballots: true } },
    },
  })
  // Add ballot counts per option
  const result = await Promise.all(
    votes.map(async (v) => {
      const optionCounts: Record<string, number> = {}
      const opts = await db.voteOption.findMany({
        where: { voteId: v.id },
        select: { id: true, _count: { select: { ballots: true } } },
      })
      for (const o of opts) optionCounts[o.id] = o._count.ballots
      return serialize({
        ...v,
        optionCounts,
      })
    })
  )
  return ok(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, question, anonymous, startDate, endDate, status, options } = body
  if (!title?.trim()) return err("Le titre est requis", 422)
  if (!question?.trim()) return err("La question est requise", 422)
  if (!startDate || !endDate) return err("Les dates sont requises", 422)

  const opts: string[] = Array.isArray(options)
    ? options.map((o: string) => String(o).trim()).filter(Boolean)
    : String(options || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
  if (opts.length < 2) return err("Au moins 2 options sont requises", 422)

  const vote = await db.vote.create({
    data: {
      title: title.trim(),
      question: question.trim(),
      anonymous: anonymous !== false,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || "OPEN",
      qrCode: genReference("VOTE"),
      options: { create: opts.map((label) => ({ label })) },
    },
    include: { options: true },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "Vote",
    entityId: vote.id,
    after: vote,
    description: `Création vote ${vote.title}`,
  })
  return ok(serialize(vote), 201)
}
