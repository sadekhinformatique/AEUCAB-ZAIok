/**
 * SGIAU — Session tokens (HMAC-SHA256 signed, web-compatible).
 *
 * This module is deliberately free of any Node-only or database imports so it
 * can run in the Next.js middleware (edge runtime) as well as in route handlers.
 *
 * Token format:  base64url(JSON payload) "." base64url(HMAC-SHA256(payload))
 * Payload:       { uid: string, exp: number (epoch ms) }
 */

export const AUTH_COOKIE = "sgiau_session"
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h — stateless token; account deactivation takes effect for new sessions immediately and for existing ones at latest at expiry

const MIN_SECRET_LENGTH = 32

export function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET manquant ou trop court (${MIN_SECRET_LENGTH}+ caractères requis). Définissez-le dans .env — ex: openssl rand -hex 32`
    )
  }
  return s
}

// --- base64url helpers (no Buffer, edge-safe) ---

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/")
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return bytesToB64url(new Uint8Array(sig))
}

/** Create a signed token for a user id, valid for SESSION_TTL_MS. */
export async function makeToken(uid: string): Promise<string> {
  const payload = { uid, exp: Date.now() + SESSION_TTL_MS }
  const body = bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await hmac(body)
  return `${body}.${sig}`
}

/** Verify a token's signature + expiry. Returns { uid } or null. */
export async function readToken(token: string | undefined | null): Promise<{ uid: string } | null> {
  if (!token) return null
  const dot = token.indexOf(".")
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!body || !sig) return null

  const expected = await hmac(body)
  if (!timingSafeEqual(expected, sig)) return null

  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as {
      uid?: unknown
      exp?: unknown
    }
    if (typeof data.uid !== "string") return null
    // exp is required — a token without an expiry is rejected
    if (typeof data.exp !== "number" || Date.now() > data.exp) return null
    return { uid: data.uid }
  } catch {
    return null
  }
}
