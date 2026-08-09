import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE, readToken } from "@/lib/sgiau/token"

/** Endpoints reachable without a session. */
const PUBLIC_API = ["/api/auth/login", "/api/auth/logout", "/api/health"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(AUTH_COOKIE)?.value
  const session = await readToken(token)

  const isApi = pathname.startsWith("/api/")

  if (isApi) {
    if (PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next()
    }
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL("/", req.url))
    return NextResponse.next()
  }

  if (!session) return NextResponse.redirect(new URL("/login", req.url))
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
}
