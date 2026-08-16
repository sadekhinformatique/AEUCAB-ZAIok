"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Home, Wallet, FileText, Send, User, LogOut, AlertCircle, Loader2, Download, Lock, ShieldCheck, MessageSquare, Trophy, Newspaper, BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Money } from "@/components/sgiau/ui"
import { QrBlock } from "@/components/sgiau/qr-block"
import { formatDate } from "@/lib/sgiau/format"
import {
  APP_NAME, UCAB_FULL_NAME, FILIERES, LEVELS, isAP,
  birthDateError, ageFromBirthDate, MIN_STUDENT_AGE, MAX_STUDENT_AGE,
} from "@/lib/sgiau/constants"
import {
  HomeTab, PaymentsTab, DocumentsTab, RequestsTab, DiscussionTab, ProfileTab, SportTab, NewsTab, NotificationBell, StatisticsTab,
  type MemberProfile, type Announcement, type Tab, REQUEST_TYPES,
} from "./modules/member-space"

type Status = "loading" | "anon" | "ready"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function MemberApp() {
  const [status, setStatus] = useState<Status>("loading")
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>("home")

  // Connexion
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  // Inscription
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login")
  const [regSaving, setRegSaving] = useState(false)
  const [regForm, setRegForm] = useState({
    firstName: "", lastName: "", sex: "M", birthDate: "", phone: "", email: "", address: "",
    faculty: "", level: "", department: "",
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    username: "", password: "",
  })

  // Mot de passe oublié
  const [forgotForm, setForgotForm] = useState({ username: "", verification: "", newPassword: "", confirm: "" })
  const [forgotSaving, setForgotSaving] = useState(false)
  const [forgotDone, setForgotDone] = useState(false)

  // Nouvelle demande
  const [reqOpen, setReqOpen] = useState(false)
  const [reqForm, setReqForm] = useState({ type: "CERTIFICATE", subject: "", body: "" })
  const [reqSaving, setReqSaving] = useState(false)

  // Reçu à afficher
  const [printReceipt, setPrintReceipt] = useState<any | null>(null)

  // PWA — installation sur l'écran d'accueil
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallEvt(null)
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [p, a, d] = await Promise.all([
        fetch("/api/member-space").then((r) => {
          // Compte en attente de changement de mot de passe (mcp) → écran dédié
          // (un 401, lui, affiche simplement l'écran de connexion intégré de l'app)
          if (r.status === 403) {
            window.location.assign("/change-password")
            return Promise.reject()
          }
          if (!r.ok) return Promise.reject()
          return r.json()
        }),
        // Le flux d'actualités ne doit JAMAIS faire tomber la session :
        // un 500 (base indisponible, colonnes manquantes…) renverrait l'utilisateur
        // au login après une connexion réussie.
        fetch("/api/member-space/announcements").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/documents?visibility=MEMBERS&limit=30").then((r) => r.json()).catch(() => []),
      ])
      setProfile(p)
      setAnnouncements(a || [])
      setDocuments(Array.isArray(d) ? d : (d?.items ?? []))
      setStatus("ready")
    } catch {
      // Session absente ou compte sans membre lié → écran de connexion
      setStatus("anon")
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setLoggingIn(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoginError(data?.error || "Échec de la connexion")
        setLoggingIn(false)
        return
      }
      if (data?.user?.mustChangePassword) {
        window.location.href = "/change-password"
        return
      }
      window.location.reload()
    } catch {
      setLoginError("Impossible de contacter le serveur.")
      setLoggingIn(false)
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    const bdError = birthDateError(regForm.birthDate)
    if (bdError) {
      setLoginError(bdError)
      return
    }
    setRegSaving(true)
    try {
      const res = await fetch("/api/member-space/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoginError(data?.error || "Erreur lors de l'inscription")
        setRegSaving(false)
        return
      }
      // Connexion automatique après l'inscription
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: regForm.username.trim(), password: regForm.password }),
      })
      window.location.reload()
    } catch {
      setLoginError("Impossible de contacter le serveur.")
      setRegSaving(false)
    }
  }

  async function forgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    if (forgotForm.newPassword !== forgotForm.confirm) {
      setLoginError("Les deux mots de passe ne correspondent pas")
      return
    }
    setForgotSaving(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotForm.username.trim(),
          verification: forgotForm.verification.trim(),
          newPassword: forgotForm.newPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoginError(data?.error || "Échec de la réinitialisation")
        setForgotSaving(false)
        return
      }
      setForgotDone(true)
      setForgotForm({ username: "", verification: "", newPassword: "", confirm: "" })
      setForgotSaving(false)
    } catch {
      setLoginError("Impossible de contacter le serveur.")
      setForgotSaving(false)
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // la session est effacée de toute façon
    }
    window.location.reload()
  }

  async function reloadRequests() {
    const res = await fetch("/api/member-space/requests")
    const data = await res.json().catch(() => [])
    setProfile((prev) => (prev ? { ...prev, requests: data || [] } : prev))
  }

  async function submitRequest() {
    if (!reqForm.subject) {
      toast.error("Sujet requis")
      return
    }
    setReqSaving(true)
    try {
      const res = await fetch("/api/member-space/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reqForm.type, subject: reqForm.subject, body: reqForm.body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Demande envoyée")
      setReqOpen(false)
      setReqForm({ type: "CERTIFICATE", subject: "", body: "" })
      reloadRequests()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setReqSaving(false)
    }
  }

  async function viewReceipt(paymentId: string) {
    try {
      const res = await fetch("/api/member-space/receipts")
      const data = await res.json()
      const found = (data || []).find((r: any) => r.paymentId === paymentId)
      if (found) {
        setPrintReceipt(found)
      } else {
        toast.error("Reçu non trouvé pour ce paiement")
      }
    } catch {
      toast.error("Échec")
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  if (status === "anon" || !profile) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 py-10 bg-gradient-to-br from-primary/15 via-background to-background">
        <img
          src="/logo-aeucab.png"
          alt="Logo de l'amicale"
          className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
        />
        <h1 className="mt-4 text-xl font-bold">{APP_NAME}</h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">Espace membre — {UCAB_FULL_NAME}</p>

        {loginError && (
          <div
            className="mt-4 flex w-full items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
            role="alert"
          >
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={login} className="mt-6 w-full space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-username" className="text-xs font-medium">Identifiant</Label>
              <Input
                id="m-username"
                autoComplete="username"
                placeholder="Votre identifiant"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loggingIn}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-password" className="text-xs font-medium">Mot de passe</Label>
              <Input
                id="m-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loggingIn}
              />
            </div>
            <Button type="submit" className="h-10 w-full gap-2" disabled={loggingIn}>
              {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {loggingIn ? "Connexion…" : "Se connecter"}
            </Button>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => { setMode("register"); setLoginError(null) }}
                className="text-center text-[11px] font-medium text-primary hover:underline"
              >
                Pas encore membre ? S'inscrire
              </button>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setLoginError(null) }}
                className="text-center text-[11px] font-medium text-muted-foreground hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={register} className="mt-6 w-full space-y-3">
            <p className="text-center text-xs font-semibold text-primary">
              Nouvelle demande d'adhésion
            </p>
            <p className="text-center text-[11px] text-muted-foreground">
              Renseignez vos informations — elles intègrent automatiquement le registre des membres et seront validées par le bureau
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nom *</Label>
                <Input value={regForm.lastName} onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })} placeholder="Nom" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prénom *</Label>
                <Input value={regForm.firstName} onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })} placeholder="Prénom" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Sexe</Label>
                <Select value={regForm.sex} onValueChange={(v) => setRegForm({ ...regForm, sex: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Homme</SelectItem>
                    <SelectItem value="F">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Date de naissance</Label>
                <Input
                  type="date"
                  min={`${new Date().getFullYear() - MAX_STUDENT_AGE}-01-01`}
                  max={`${new Date().getFullYear() - MIN_STUDENT_AGE}-12-31`}
                  value={regForm.birthDate}
                  onChange={(e) => setRegForm({ ...regForm, birthDate: e.target.value })}
                />
                {regForm.birthDate && (() => {
                  const err = birthDateError(regForm.birthDate)
                  const age = ageFromBirthDate(regForm.birthDate)
                  return err ? (
                    <p className="text-[10px] text-rose-500">{err}</p>
                  ) : age !== null ? (
                    <p className="text-[10px] text-muted-foreground">Âge calculé : <span className="font-medium">{age} ans</span></p>
                  ) : null
                })()}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Téléphone</Label>
              <Input value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} placeholder="+221 …" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} placeholder="vous@exemple.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Adresse</Label>
              <Input value={regForm.address} onChange={(e) => setRegForm({ ...regForm, address: e.target.value })} placeholder="Ville, quartier…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Filière</Label>
                <Select value={regForm.faculty} onValueChange={(v) => setRegForm({ ...regForm, faculty: v, ...(isAP(v) ? { level: "" } : {}) })}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {FILIERES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Niveau</Label>
                <Select value={regForm.level} disabled={isAP(regForm.faculty)} onValueChange={(v) => setRegForm({ ...regForm, level: v })}>
                  <SelectTrigger><SelectValue placeholder={isAP(regForm.faculty) ? "Aucun niveau" : "Choisir…"} /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                {isAP(regForm.faculty) && <p className="text-[10px] text-muted-foreground">L'Année Préparatoire n'a pas de niveau.</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Année universitaire</Label>
                <Input value={regForm.academicYear} onChange={(e) => setRegForm({ ...regForm, academicYear: e.target.value })} placeholder="2026-2027" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Département (option)</Label>
                <Input value={regForm.department} onChange={(e) => setRegForm({ ...regForm, department: e.target.value })} placeholder="Informatique…" />
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="mb-3 text-[11px] font-medium text-muted-foreground">
                Identifiants de connexion
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Identifiant *</Label>
                  <Input value={regForm.username} onChange={(e) => setRegForm({ ...regForm, username: e.target.value })} placeholder="3 caractères min." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Mot de passe *</Label>
                  <Input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} placeholder="8 car. + majuscule, chiffre, symbole" />
                </div>
              </div>
            </div>
            <Button type="submit" className="h-10 w-full gap-2" disabled={regSaving}>
              {regSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {regSaving ? "Envoi…" : "Déposer la demande d'adhésion"}
            </Button>
            <button
              type="button"
              onClick={() => { setMode("login"); setLoginError(null) }}
              className="w-full text-center text-[11px] font-medium text-primary hover:underline"
            >
              J'ai déjà un compte — Se connecter
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={forgotPassword} className="mt-6 w-full space-y-3">
            <p className="text-center text-xs font-semibold text-primary">
              Mot de passe oublié
            </p>
            {forgotDone ? (
              <>
                <div className="flex w-full items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700" role="status">
                  <ShieldCheck className="mt-px h-4 w-4 shrink-0" />
                  <span>Mot de passe réinitialisé ! Connectez-vous avec votre nouveau mot de passe.</span>
                </div>
                <Button
                  type="button"
                  className="h-10 w-full gap-2"
                  onClick={() => { setMode("login"); setForgotDone(false); setLoginError(null) }}
                >
                  <Lock className="h-4 w-4" /> Retour à la connexion
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-[11px] text-muted-foreground">
                  Vérifiez votre identité avec une information de votre dossier (date de naissance, email ou téléphone), puis choisissez un nouveau mot de passe.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Identifiant *</Label>
                  <Input
                    value={forgotForm.username}
                    onChange={(e) => setForgotForm({ ...forgotForm, username: e.target.value })}
                    placeholder="Votre identifiant"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Vérification *</Label>
                  <Input
                    value={forgotForm.verification}
                    onChange={(e) => setForgotForm({ ...forgotForm, verification: e.target.value })}
                    placeholder="Date de naissance (AAAA-MM-JJ), email ou téléphone"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nouveau mot de passe *</Label>
                  <Input
                    type="password"
                    value={forgotForm.newPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                    placeholder="8 car. + majuscule, chiffre, symbole"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Confirmer le mot de passe *</Label>
                  <Input
                    type="password"
                    value={forgotForm.confirm}
                    onChange={(e) => setForgotForm({ ...forgotForm, confirm: e.target.value })}
                    placeholder="Retapez le mot de passe"
                  />
                </div>
                <Button type="submit" className="h-10 w-full gap-2" disabled={forgotSaving}>
                  {forgotSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {forgotSaving ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode("login"); setLoginError(null) }}
                  className="w-full text-center text-[11px] font-medium text-primary hover:underline"
                >
                  Retour à la connexion
                </button>
              </>
            )}
          </form>
        )}

        <p className="mt-8 flex items-center gap-1.5 text-center text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Application mobile des membres — session sécurisée
        </p>

        {installEvt && (
          <button
            onClick={async () => {
              await installEvt.prompt()
              setInstallEvt(null)
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            <Download className="h-3.5 w-3.5" />
            Ajouter à l'écran d'accueil
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/logo-aeucab.png"
            alt="Logo de l'amicale"
            className="h-8 w-8 shrink-0 rounded-full bg-white object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">{APP_NAME} — Espace membre</p>
            <p className="mt-0.5 truncate text-[10px] opacity-80">{UCAB_FULL_NAME}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <button onClick={logout} className="rounded-lg p-1.5 hover:bg-primary-foreground/10" title="Déconnexion">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 pb-16">
        {tab === "home" && <HomeTab profile={profile} announcements={announcements} setTab={setTab} />}
        {tab === "payments" && <PaymentsTab profile={profile} onViewReceipt={viewReceipt} />}
        {tab === "documents" && <DocumentsTab documents={documents} />}
        {tab === "requests" && <RequestsTab profile={profile} onNew={() => setReqOpen(true)} />}
        {tab === "news" && <NewsTab announcements={announcements} />}
        {tab === "discussion" && <DiscussionTab profile={profile} />}
        {tab === "sport" && <SportTab profile={profile} />}
        {tab === "stats" && <StatisticsTab />}
        {tab === "profile" && <ProfileTab profile={profile} />}
      </main>

      {/* Onglets bas */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-md grid-cols-9 border-t bg-card">
        {(
          [
            { key: "home", label: "Accueil", icon: Home },
            { key: "payments", label: "Cotis.", icon: Wallet },
            { key: "documents", label: "Docs", icon: FileText },
            { key: "requests", label: "Demandes", icon: Send },
            { key: "news", label: "Actus", icon: Newspaper },
            { key: "sport", label: "Sport", icon: Trophy },
            { key: "stats", label: "Stats", icon: BarChart3 },
            { key: "discussion", label: "Discussion", icon: MessageSquare },
            { key: "profile", label: "Profil", icon: User },
          ] as { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[]
        ).map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] font-medium leading-none">{t.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Nouvelle demande */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type de demande</Label>
              <Select value={reqForm.type} onValueChange={(v) => setReqForm({ ...reqForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REQUEST_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sujet</Label>
              <Input value={reqForm.subject} onChange={(e) => setReqForm({ ...reqForm, subject: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Message</Label>
              <Textarea rows={3} value={reqForm.body} onChange={(e) => setReqForm({ ...reqForm, body: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqOpen(false)}>Annuler</Button>
            <Button onClick={submitRequest} disabled={reqSaving}>{reqSaving ? "Envoi…" : "Envoyer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reçu imprimable */}
      {printReceipt && (
        <Dialog open={!!printReceipt} onOpenChange={(o) => !o && setPrintReceipt(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reçu n° {printReceipt.number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <div className="border-b pb-3 text-center">
                <p className="text-base font-semibold">{UCAB_FULL_NAME}</p>
                <p className="text-xs text-muted-foreground">Reçu officiel de paiement</p>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membre :</span>
                <span className="font-medium">{profile.member.firstName} {profile.member.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Matricule :</span>
                <span className="font-mono">{profile.member.matricule}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Référence :</span>
                <span className="font-mono">{printReceipt.payment?.reference ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cotisation :</span>
                <span>{printReceipt.payment?.cotisationType?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date :</span>
                <span>{formatDate(printReceipt.payment?.paymentDate ?? printReceipt.createdAt)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Montant :</span>
                <span><Money value={printReceipt.amount} /></span>
              </div>
              <div className="flex justify-center pt-3">
                <QrBlock value={printReceipt.qrCode || printReceipt.number} size={80} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPrintReceipt(null)}>Fermer</Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Download className="h-4 w-4" /> Imprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
