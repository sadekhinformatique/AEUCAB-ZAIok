import { dbHealthCheck } from "@/lib/db"
import { ok, err } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface HealthResult {
  status: "healthy" | "unhealthy"
  database: { ok: boolean; latencyMs: number }
  timestamp: string
  environment: string
}

export async function GET() {
  const environment = process.env.NODE_ENV || "development"
  const dbCheck = await dbHealthCheck()

  // No database counts here: this endpoint is public and must not leak
  // operational data (user/member/payment volumes) to unauthenticated callers.
  const result: HealthResult = {
    status: dbCheck.ok ? "healthy" : "unhealthy",
    database: dbCheck,
    timestamp: new Date().toISOString(),
    environment,
  }

  return dbCheck.ok ? ok(result) : err("Database unreachable", 503, result)
}
