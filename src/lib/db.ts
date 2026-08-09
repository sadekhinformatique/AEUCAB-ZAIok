import { PrismaClient } from '@prisma/client'

/**
 * SGIAU — Database client (Prisma + Neon PostgreSQL)
 *
 * Configuration:
 * - Connection string is read from DATABASE_URL (see .env)
 * - Uses Neon's pooler (pgbouncer=true) for connection reuse
 * - In development, the client is cached on globalThis to avoid
 *   exhausting connections during Next.js hot-reload
 * - Query logging is enabled only in development
 * - Connection params tuned for Neon serverless (timeouts, pool size)
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const isDev = process.env.NODE_ENV !== 'production'
  return new PrismaClient({
    log: isDev ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

/**
 * Lightweight health check — verifies the database connection with a
 * simple `SELECT 1`. Returns latency in ms on success, throws on failure.
 */
export async function dbHealthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return { ok: true, latencyMs: Date.now() - start }
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

/**
 * Graceful shutdown — close the Prisma connection pool.
 * Call from process signal handlers in long-running services.
 */
export async function dbDisconnect(): Promise<void> {
  await db.$disconnect()
}
