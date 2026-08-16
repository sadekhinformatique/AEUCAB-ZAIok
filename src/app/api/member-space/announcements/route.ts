import { db } from "@/lib/db"
import { ok, serialize } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET() {
  // Dégradation propre : si la lecture échoue (schéma non migré, base en pause…),
  // renvoyer une liste vide plutôt qu'un 500 qui ferait tomber l'app membre.
  try {
    const items = await db.announcement.findMany({
      where: { OR: [{ audience: "ALL" }, { audience: "MEMBERS" }] },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 50,
    })
    return ok(serialize(items))
  } catch (e) {
    console.error("announcements: lecture impossible, liste vide renvoyée", (e as Error).message)
    return ok([])
  }
}
