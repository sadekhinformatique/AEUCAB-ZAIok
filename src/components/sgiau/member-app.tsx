"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Home, Wallet, FileText, Send, User, LogOut, AlertCircle, Loader2, Download, Lock, ShieldCheck,
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
import { APP_NAME, UCAB_FULL_NAME } from "@/lib/sgiau/constants"
import {
  HomeTab, PaymentsTab, DocumentsTab, RequestsTab, ProfileTab,
  type MemberProfile, type Announcement, type Tab, REQUEST_TYPES,
} from "./modules/member-space"

type Status = "loading" | "anon" | "ready"

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

  // Nouvelle demande
  const [reqOpen, setReqOpen] = useState(false)
  const [reqForm, setReqForm] = useState({ type: "CERTIFICATE", subject: "", body: "" })
  const [reqSaving, setReqSaving] = useState(false)

  // Reçu à afficher
  const [printReceipt, setPrintReceipt] = useState<any | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [p, a, d] = await Promise.all([
        fetch("/api/member-space").then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch("/api/member-space/announcements").then((r) => r.json()),
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
      <div className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-br from-primary/15 via-background to-background">
        <img
          src="/logo-aeucab.png"
          alt="Logo de l'amicale"
          className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
        />
        <h1 className="mt-4 text-xl font-bold">{APP_NAME}</h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">Espace membre — {UCAB_FULL_NAME}</p>

        <form onSubmit={login} className="mt-8 w-full space-y-4">
          {loginError && (
            <div
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
              role="alert"
            >
              <AlertCircle className="mt-px h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}
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
        </form>

        <p className="mt-8 flex items-center gap-1.5 text-center text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Application mobile des membres — session sécurisée
        </p>
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
        <button onClick={logout} className="shrink-0 rounded-lg p-1.5 hover:bg-primary-foreground/10" title="Déconnexion">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Contenu */}
      <main className="flex-1 pb-16">
        {tab === "home" && <HomeTab profile={profile} announcements={announcements} setTab={setTab} />}
        {tab === "payments" && <PaymentsTab profile={profile} onViewReceipt={viewReceipt} />}
        {tab === "documents" && <DocumentsTab documents={documents} />}
        {tab === "requests" && <RequestsTab profile={profile} onNew={() => setReqOpen(true)} />}
        {tab === "profile" && <ProfileTab profile={profile} />}
      </main>

      {/* Onglets bas */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-md grid-cols-5 border-t bg-card">
        {(
          [
            { key: "home", label: "Accueil", icon: Home },
            { key: "payments", label: "Cotis.", icon: Wallet },
            { key: "documents", label: "Docs", icon: FileText },
            { key: "requests", label: "Demandes", icon: Send },
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
              <span className="text-[9px] font-medium">{t.label}</span>
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
