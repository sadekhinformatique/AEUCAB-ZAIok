import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE, readToken } from "@/lib/sgiau/token"

/** Endpoints reachable without a session. */
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/change-password",
  "/api/auth/forgot-password",
  "/api/health",
  "/api/member-space/register",
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(AUTH_COOKIE)?.value
  const session = await readToken(token)
  const mcp = session?.mcp === true

  const isApi = pathname.startsWith("/api/")

  if (isApi) {
    if (PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next()
    }
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    if (mcp) {
      return NextResponse.json(
        { error: "Changement de mot de passe requis", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 403 }
      )
    }
    return NextResponse.next()
  }

  if (pathname === "/change-password") {
    if (!session) return NextResponse.redirect(new URL("/login", req.url))
    if (!mcp) return NextResponse.redirect(new URL("/", req.url))
    return NextResponse.next()
  }

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL(mcp ? "/change-password" : "/", req.url))
    return NextResponse.next()
  }

  // Application mobile des membres : l'écran de connexion est intégré à la page
  if (pathname.startsWith("/espace-membre")) {
    return NextResponse.next()
  }

  if (!session) return NextResponse.redirect(new URL("/login", req.url))
  if (mcp) return NextResponse.redirect(new URL("/change-password", req.url))
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|sw\\.js$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|webmanifest)$).*)",
  ],
}
