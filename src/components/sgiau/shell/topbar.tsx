"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Menu, Search, Bell, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSgiau } from "@/lib/sgiau/store"
import { redirectOnAuthStatus } from "@/lib/sgiau/client-auth"
import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ROLE_LABELS } from "@/lib/sgiau/constants"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SessionUser {
  id: string
  username: string
  fullName: string
  role: string
}

export function Topbar() {
  const { theme, setTheme } = useTheme()
  const { toggleSidebar, setModule, searchQuery, setSearch } = useSgiau()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    // 401 (session expirée) → /login ; 403 (mot de passe temporaire, mcp) → /change-password
    const redirectIfUnauthorized = (r: Response) => redirectOnAuthStatus(r)

    fetch("/api/users/me")
      .then((r) => {
        if (redirectIfUnauthorized(r)) return null
        return r.ok ? r.json() : null
      })
      .then((d) => {
        if (d?.user) setUser(d.user)
      })
      .catch(() => {})
    fetch("/api/notifications?unread=1")
      .then((r) => {
        if (redirectIfUnauthorized(r)) return null
        return r.ok ? r.json() : null
      })
      .then((d) => setNotifCount(d?.count ?? 0))
      .catch(() => {})
  }, [])

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // ignore — clear the session anyway
    }
    window.location.href = "/login"
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-3 px-4 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher membres, paiements, documents…"
          className="pl-9 h-9"
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setModule("search")
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setModule("notifications")}
          className="relative"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Thème"
        >
          {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg pl-1.5 pr-2 py-1 hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {user?.fullName?.[0] ?? "A"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-none">{user?.fullName ?? "Administrateur"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {user ? ROLE_LABELS[user.role] ?? user.role : "—"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Session</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setModule("users")}>
              Utilisateurs & sécurité
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setModule("audit")}>
              Journal d'audit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setModule("sync")}>
              Synchronisation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
