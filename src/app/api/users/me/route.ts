import { ok, serialize } from "@/lib/sgiau/api"
import { getSessionUser } from "@/lib/sgiau/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return ok({ user: null })
  return ok({ user: serialize({ ...user, passwordHash: undefined }) })
}
