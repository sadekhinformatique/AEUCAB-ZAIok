// Copy static + public assets into the standalone output.
// Replaces `cp -r` which the bun shell does not support.
// No-op when the standalone server was not generated (e.g. Vercel builds).
import { cpSync, existsSync, mkdirSync } from "node:fs"

if (!existsSync(".next/standalone/server.js")) {
  console.log("⏭ Standalone non généré (build Vercel ou output désactivé) — copie ignorée")
  process.exit(0)
}

const dst = ".next/standalone/.next"
mkdirSync(dst, { recursive: true })

if (existsSync(".next/static")) {
  cpSync(".next/static", `${dst}/static`, { recursive: true })
  console.log("✓ .next/static → .next/standalone/.next/static")
}
if (existsSync("public")) {
  cpSync("public", ".next/standalone/public", { recursive: true })
  console.log("✓ public → .next/standalone/public")
}
