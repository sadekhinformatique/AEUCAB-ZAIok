"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Lock, User, LogIn, ShieldCheck, AlertTriangle, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  APP_NAME,
  UCAB_EMAIL,
  UCAB_FULL_NAME,
  UCAB_MOTTO,
  UCAB_PHONE,
} from "@/lib/sgiau/constants"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError("Veuillez saisir votre identifiant et votre mot de passe.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Échec de la connexion")
        setLoading(false)
        return
      }
      window.location.href = data?.user?.mustChangePassword ? "/change-password" : "/"
    } catch {
      setError("Impossible de contacter le serveur.")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-teal-400/15 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-700/30 bg-white p-1 shadow-lg shadow-emerald-700/20">
              <img
                src="/logo-aeucab.png"
                alt="Logo de l'amicale"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              {UCAB_FULL_NAME}
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">{APP_NAME}</h1>
            <p className="mt-2 text-[11px] italic text-muted-foreground/80">« {UCAB_MOTTO} »</p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="px-8 pb-8 space-y-4">
            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                  role="alert"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium">
                Identifiant
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="admin"
                  className="pl-9 h-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="pl-9 h-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? "Connexion…" : "Se connecter"}
            </Button>

            <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Session sécurisée — accès réservé aux membres du bureau
            </p>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {UCAB_EMAIL}
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {UCAB_PHONE}
          </span>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-500">SGIAU · Next.js · PostgreSQL · v1.0</p>
      </motion.div>
    </main>
  )
}
