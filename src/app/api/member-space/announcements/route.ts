import { db } from "@/lib/db"
import { ok, serialize } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET() {
  const items = await db.announcement.findMany({
    where: { OR: [{ audience: "ALL" }, { audience: "MEMBERS" }] },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 50,
  })
  return ok(serialize(items))
}
