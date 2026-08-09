"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { GraduationCap, Lock, ShieldCheck, KeyRound, AlertTriangle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { APP_FULL_NAME, APP_NAME } from "@/lib/sgiau/constants"

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Veuillez remplir tous les champs.")
      return
    }
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Échec du changement de mot de passe")
        setLoading(false)
        return
      }
      window.location.href = "/"
    } catch {
      setError("Impossible de contacter le serveur.")
      setLoading(false)
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    window.location.href = "/login"
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-teal-400/15 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-2xl shadow-black/40 overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Changement de mot de passe</h1>
            <p className="mt-1 text-xs text-muted-foreground">{APP_FULL_NAME}</p>
          </div>

          <form onSubmit={submit} className="px-8 pb-6 space-y-4">
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
              <span>
                Votre compte utilise un mot de passe temporaire. Définissez un nouveau mot de passe
                personnel avant de continuer ({APP_NAME}).
              </span>
            </p>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-xs font-medium">
                Mot de passe actuel
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className="pl-9 h-10"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-medium">
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  className="pl-9 h-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium">
                Confirmer le nouveau mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="pl-9 h-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
              <ShieldCheck className="h-4 w-4" />
              {loading ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
            </Button>

            <button
              type="button"
              onClick={logout}
              className="mx-auto flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  )
}
