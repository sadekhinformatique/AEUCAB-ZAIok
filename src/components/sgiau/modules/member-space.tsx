"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { PageHeader, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import {
  Smartphone, Home, Wallet, FileText, Send, User, LogOut, Pin, CheckCircle2,
  AlertCircle, Download, ChevronRight, Bell, Search, MessageSquare, Loader2,
  Trophy, CalendarDays, MapPin, Clock, UserPlus, Trash2, Pencil, Save, ExternalLink, Newspaper, XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDate, formatDateTime, initials } from "@/lib/sgiau/format"
import { UCAB_FULL_NAME } from "@/lib/sgiau/constants"
import { QrBlock } from "@/components/sgiau/qr-block"

interface SimpleMember { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null; level: string | null }

export interface MemberProfile {
  member: {
    id: string; matricule: string; firstName: string; lastName: string; sex: string
    email: string | null; phone: string | null; faculty: string | null
    department: string | null; level: string | null; academicYear: string | null
    status: string; qrCode: string | null
    adhesion: { status: string; refusalReason?: string | null; createdAt?: string } | null
    card: any | null
    payments: any[]
  }
  requests: any[]
  stats: {
    totalPaid: number; totalDue: number; remaining: number; isUpToDate: boolean
    paymentsCount: number; lastPaymentDate: string | null; hasCard: boolean
  }
}

export interface Announcement {
  id: string; title: string; body: string; pinned: boolean; publishedAt: string
  category?: string; imageUrl?: string | null; gallery?: string | null; videoUrl?: string | null
  fileUrl?: string | null; fileName?: string | null; linkUrl?: string | null; audience?: string
}

export const REQUEST_TYPES: Record<string, string> = {
  CERTIFICATE: "Attestation / Certificat",
  RECEIPT: "Reçu",
  CARD_RENEWAL: "Renouvellement de carte",
  OTHER: "Autre",
}

export type Tab = "home" | "payments" | "documents" | "requests" | "news" | "sport" | "discussion" | "profile"

export const ANNOUNCEMENT_CATEGORIES: Record<string, { label: string; cls: string; icon: string }> = {
  GENERAL: { label: "Générale", cls: "bg-slate-100 text-slate-700", icon: "📢" },
  COTISATION: { label: "Cotisations", cls: "bg-amber-50 text-amber-700", icon: "💰" },
  SPORT: { label: "Sport", cls: "bg-emerald-50 text-emerald-700", icon: "🏆" },
  ACTIVITY: { label: "Activité", cls: "bg-cyan-50 text-cyan-700", icon: "📅" },
  INFO: { label: "Information", cls: "bg-violet-50 text-violet-700", icon: "ℹ️" },
}

export default function MemberSpaceModule() {
  const [members, setMembers] = useState<SimpleMember[]>([])
  const [loading, setLoading] = useState(true)
  const [memberSearch, setMemberSearch] = useState("")
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)

  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>("home")
  const [profileLoading, setProfileLoading] = useState(false)

  // new request form
  const [reqOpen, setReqOpen] = useState(false)
  const [reqForm, setReqForm] = useState({ type: "CERTIFICATE", subject: "", body: "" })
  const [reqSaving, setReqSaving] = useState(false)

  // printable views
  const [printReceipt, setPrintReceipt] = useState<any | null>(null)

  useEffect(() => {
    fetch("/api/members?limit=500")
      .then((r) => r.json())
      .then((data) => setMembers(data || []))
      .finally(() => setLoading(false))
  }, [])

  const loadProfile = useCallback(async (memberId: string) => {
    setProfileLoading(true)
    try {
      const [p, a, d] = await Promise.all([
        fetch(`/api/member-space?memberId=${memberId}`).then((r) => r.json()),
        fetch("/api/member-space/announcements").then((r) => r.json()),
        fetch("/api/documents?visibility=MEMBERS&limit=30").then((r) => r.json()).catch(() => []),
      ])
      setProfile(p)
      setAnnouncements(a || [])
      setDocuments(Array.isArray(d) ? d : (d?.items ?? []))
    } catch {
      toast.error("Échec du chargement du profil")
    } finally {
      setProfileLoading(false)
    }
  }, [])

  function connect() {
    if (!selectedMemberId) {
      toast.error("Sélectionnez un membre")
      return
    }
    setLoggedIn(true)
    setTab("home")
    loadProfile(selectedMemberId)
  }

  function disconnect() {
    setLoggedIn(false)
    setProfile(null)
    setSelectedMemberId("")
  }

  const filteredMembers = members.filter((m) =>
    !memberSearch ||
    m.matricule.includes(memberSearch) ||
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
  )

  async function reloadRequests() {
    if (!selectedMemberId) return
    const res = await fetch(`/api/member-space/requests?memberId=${selectedMemberId}`)
    const data = await res.json()
    setProfile((prev) => prev ? { ...prev, requests: data || [] } : prev)
  }

  async function submitRequest() {
    if (!reqForm.subject) { toast.error("Sujet requis"); return }
    setReqSaving(true)
    try {
      const res = await fetch("/api/member-space/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMemberId, ...reqForm }),
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
    // Look for receipt linked to this payment
    try {
      const res = await fetch(`/api/member-space/receipts?memberId=${selectedMemberId}`)
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

  function printReceiptView() {
    if (!printReceipt || !profile) return null
    const p = printReceipt.payment
    const m = profile.member
    return (
      <Dialog open={!!printReceipt} onOpenChange={(o) => !o && setPrintReceipt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reçu n° {printReceipt.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="text-center pb-3 border-b">
              <img src="/logo-aeucab.png" alt="Logo de l'amicale" className="mx-auto mb-2 h-12 w-12 rounded-full border-2 border-primary/30 bg-white object-cover" />
              <p className="font-semibold text-base">{UCAB_FULL_NAME}</p>
              <p className="text-xs text-muted-foreground">Reçu officiel de paiement</p>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Membre:</span>
              <span className="font-medium">{m.firstName} {m.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Matricule:</span>
              <span className="font-mono">{m.matricule}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Référence paiement:</span>
              <span className="font-mono">{p?.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cotisation:</span>
              <span>{p?.cotisationType?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{formatDate(p?.paymentDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode:</span>
              <span>{p?.paymentMode}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-3">
              <span>Montant:</span>
              <span><Money value={printReceipt.amount} /></span>
            </div>
            <div className="flex justify-center pt-3">
              <QrBlock value={printReceipt.qrCode || printReceipt.number} size={80} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintReceipt(null)}>Fermer</Button>
            <Button onClick={() => window.print()}>Imprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espace membre (simulation mobile)"
        description="Aperçu de l'application mobile accessible aux membres — annonces, cotisations, documents, demandes et profil"
        icon={Smartphone}
      />

      <div className="flex justify-center">
        {/* Phone mockup */}
        <div className="mx-auto w-full max-w-sm rounded-[2.5rem] border-8 border-slate-900 dark:border-slate-700 bg-background shadow-2xl overflow-hidden">
          {/* Notch */}
          <div className="relative bg-slate-900 dark:bg-slate-700 h-6 flex items-center justify-center">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-24 h-3 bg-slate-900 dark:bg-slate-700 rounded-full border border-slate-800" />
          </div>

          {!loggedIn ? (
            <LoginScreen
              loading={loading}
              memberSearch={memberSearch}
              setMemberSearch={setMemberSearch}
              filteredMembers={filteredMembers}
              selectedMemberId={selectedMemberId}
              setSelectedMemberId={setSelectedMemberId}
              connect={connect}
            />
          ) : profileLoading || !profile ? (
            <div className="h-[640px] flex items-center justify-center"><LoadingState rows={4} /></div>
          ) : (
            <>
              {/* App header */}
              <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary-foreground/15 p-1.5"><Smartphone className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-semibold leading-none">Espace membre</p>
                    <p className="text-[10px] opacity-80">{profile.member.firstName} {profile.member.lastName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <NotificationBell memberId={selectedMemberId} />
                  <button onClick={disconnect} className="rounded-lg p-1.5 hover:bg-primary-foreground/10" title="Déconnexion">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Content area */}
              <div className="h-[560px] overflow-y-auto scroll-thin bg-muted/30">
                {tab === "home" && (
                  <HomeTab profile={profile} announcements={announcements} setTab={setTab} />
                )}
                {tab === "payments" && (
                  <PaymentsTab profile={profile} onViewReceipt={viewReceipt} />
                )}
                {tab === "documents" && (
                  <DocumentsTab documents={documents} />
                )}
                {tab === "requests" && (
                  <RequestsTab profile={profile} onNew={() => setReqOpen(true)} />
                )}
                {tab === "news" && (
                  <NewsTab announcements={announcements} memberId={selectedMemberId} />
                )}
                {tab === "discussion" && (
                  <DiscussionTab profile={profile} />
                )}
                {tab === "sport" && (
                  <SportTab profile={profile} memberId={selectedMemberId} />
                )}
                {tab === "profile" && (
                  <ProfileTab profile={profile} />
                )}
              </div>

              {/* Bottom tabs */}
              <div className="grid grid-cols-8 border-t bg-card">
                {([
                  { key: "home", label: "Accueil", icon: Home },
                  { key: "payments", label: "Cotis.", icon: Wallet },
                  { key: "documents", label: "Docs", icon: FileText },
                  { key: "requests", label: "Demandes", icon: Send },
                  { key: "news", label: "Actus", icon: Newspaper },
                  { key: "sport", label: "Sport", icon: Trophy },
                  { key: "discussion", label: "Discussion", icon: MessageSquare },
                  { key: "profile", label: "Profil", icon: User },
                ] as { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[]).map((t) => {
                  const Icon = t.icon
                  const active = tab === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`flex flex-col items-center justify-center py-2 gap-0.5 ${active ? "text-primary" : "text-muted-foreground"}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] font-medium">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* New request dialog */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Type de demande">
              <Select value={reqForm.type} onValueChange={(v) => setReqForm({ ...reqForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(REQUEST_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Sujet"><Input value={reqForm.subject} onChange={(e) => setReqForm({ ...reqForm, subject: e.target.value })} /></Field>
            <Field label="Message"><Textarea rows={3} value={reqForm.body} onChange={(e) => setReqForm({ ...reqForm, body: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqOpen(false)}>Annuler</Button>
            <Button onClick={submitRequest} disabled={reqSaving}>{reqSaving ? "Envoi…" : "Envoyer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printReceiptView()}
    </div>
  )
}

function LoginScreen({ loading, memberSearch, setMemberSearch, filteredMembers, selectedMemberId, setSelectedMemberId, connect }: {
  loading: boolean
  memberSearch: string
  setMemberSearch: (v: string) => void
  filteredMembers: SimpleMember[]
  selectedMemberId: string
  setSelectedMemberId: (v: string) => void
  connect: () => void
}) {
  return (
    <div className="h-[640px] flex flex-col bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="rounded-2xl bg-primary p-4 mb-4">
          <Smartphone className="h-10 w-10 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold">Espace membre</h2>
        <p className="text-xs text-muted-foreground mt-1 text-center">Connectez-vous avec votre matricule pour accéder à votre espace</p>

        <div className="w-full mt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher matricule ou nom…" className="pl-9" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
          </div>
          <div className="rounded-lg border max-h-56 overflow-y-auto scroll-thin bg-card">
            {loading ? (
              <p className="p-3 text-xs text-muted-foreground text-center">Chargement…</p>
            ) : filteredMembers.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground text-center">Aucun membre</p>
            ) : filteredMembers.slice(0, 30).map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className={`w-full text-left p-2.5 border-b last:border-0 hover:bg-accent transition-colors ${selectedMemberId === m.id ? "bg-primary/10" : ""}`}
              >
                <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{m.matricule} · {m.faculty ?? "—"} · {m.level ?? "—"}</p>
              </button>
            ))}
          </div>
          <Button onClick={connect} className="w-full" disabled={!selectedMemberId}>Connexion</Button>
        </div>
      </div>
    </div>
  )
}

function AdhesionStatusCard({ adhesion }: { adhesion: { status: string; refusalReason?: string | null; createdAt?: string } }) {
  const s = adhesion.status
  const styles: Record<string, { label: string; sub: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: "Demande d'adhésion en attente",
      sub: "En cours de validation par le bureau (secrétaire → président)",
      cls: "border-amber-300 bg-amber-50 text-amber-800",
      icon: <AlertCircle className="h-4 w-4" />,
    },
    SG_APPROVED: {
      label: "Adhésion validée par le secrétaire",
      sub: "En attente de l'approbation du président",
      cls: "border-sky-300 bg-sky-50 text-sky-800",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    PRESIDENT_APPROVED: {
      label: "Adhésion validée — bienvenue !",
      sub: "Votre carte de membre est disponible",
      cls: "border-emerald-300 bg-emerald-50 text-emerald-800",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    REFUSED: {
      label: "Demande d'adhésion refusée",
      sub: adhesion.refusalReason || "Contactez le bureau de l'amicale pour plus d'informations",
      cls: "border-rose-300 bg-rose-50 text-rose-800",
      icon: <AlertCircle className="h-4 w-4" />,
    },
  }
  const st = styles[s] ?? styles.PENDING
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 ${st.cls}`}>
      <span className="mt-px shrink-0">{st.icon}</span>
      <div>
        <p className="text-xs font-semibold">{st.label}</p>
        <p className="mt-0.5 text-[11px] opacity-80">{st.sub}</p>
      </div>
    </div>
  )
}

export function HomeTab({ profile, announcements, setTab }: { profile: MemberProfile; announcements: Announcement[]; setTab: (t: Tab) => void }) {
  const m = profile.member
  return (
    <div className="p-3 space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
        <p className="text-xs opacity-80">Bonjour</p>
        <p className="text-lg font-semibold">{m.firstName} {m.lastName}</p>
        <p className="text-[10px] opacity-80 font-mono">{m.matricule}</p>
      </div>

      {/* Suivi de la demande d'adhésion */}
      {m.adhesion && (
        <AdhesionStatusCard adhesion={m.adhesion} />
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setTab("payments")} className="rounded-lg border bg-card p-3 text-left">
          <div className="flex items-center justify-between">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            {profile.stats.isUpToDate ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Cotisation</p>
          <p className="text-sm font-semibold">{profile.stats.isUpToDate ? "À jour" : "En retard"}</p>
        </button>
        <button onClick={() => setTab("documents")} className="rounded-lg border bg-card p-3 text-left">
          <div className="flex items-center justify-between">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Statut</p>
          <p className="text-sm font-semibold">{m.status}</p>
        </button>
      </div>

      {profile.stats.totalDue > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total payé</span>
            <span className="font-semibold"><Money value={profile.stats.totalPaid} /></span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Reste à payer</span>
            <span className="font-semibold text-amber-600"><Money value={profile.stats.remaining} /></span>
          </div>
        </div>
      )}

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Annonces</p>
          <button onClick={() => setTab("news")} className="text-[10px] font-medium text-primary hover:underline">
            Toutes les actualités →
          </button>
        </div>
        {announcements.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Aucune annonce</p>
        ) : (
          <div className="space-y-2">
            {announcements.slice(0, 6).map((a) => (
              <div key={a.id} className={`rounded-lg border bg-card p-3 ${a.pinned ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="flex items-center gap-1.5">
                  {a.pinned && <Pin className="h-3 w-3 text-primary" />}
                  <p className="text-sm font-medium flex-1">{a.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{formatDate(a.publishedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function PaymentsTab({ profile, onViewReceipt }: { profile: MemberProfile; onViewReceipt: (paymentId: string) => void }) {
  const payments = profile.member.payments || []
  return (
    <div className="p-3 space-y-3">
      <div className="rounded-lg border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">Total payé (cotisations)</p>
        <p className="text-xl font-bold"><Money value={profile.stats.totalPaid} /></p>
        {profile.stats.remaining > 0 && (
          <p className="text-xs text-amber-600 mt-1">Reste <Money value={profile.stats.remaining} /> à régler</p>
        )}
      </div>

      <p className="text-xs font-medium text-muted-foreground">Historique des paiements</p>
      {payments.length === 0 ? (
        <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Aucun paiement</p>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <div key={p.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.cotisationType?.name ?? "Cotisation"}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(p.paymentDate)} · {p.reference}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold"><Money value={p.amountPaid} /></p>
                  <Badge variant="outline" className="text-[9px]">{p.status}</Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2 h-7 text-xs gap-1.5"
                onClick={() => onViewReceipt(p.id)}
              >
                <Download className="h-3 w-3" /> Télécharger le reçu
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function DocumentsTab({ documents }: { documents: any[] }) {
  return (
    <div className="p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Documents accessibles aux membres</p>
      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Aucun document</p>
      ) : (
        <div className="space-y-2">
          {documents.map((d: any) => (
            <div key={d.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-4 w-4 text-primary" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{d.title}</p>
                <p className="text-[10px] text-muted-foreground">{d.category} · {formatDate(d.createdAt)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RequestsTab({ profile, onNew }: { profile: MemberProfile; onNew: () => void }) {
  const requests = profile.requests || []
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Mes demandes</p>
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={onNew}><Send className="h-3 w-3" /> Nouvelle</Button>
      </div>
      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Aucune demande</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r: any) => (
            <div key={r.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[9px]">{REQUEST_TYPES[r.type] ?? r.type}</Badge>
                <Badge variant="outline" className={`text-[9px] ${r.status === "PENDING" ? "bg-amber-50 text-amber-700" : r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{r.status}</Badge>
              </div>
              <p className="text-sm font-medium mt-1.5">{r.subject}</p>
              {r.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{formatDate(r.createdAt)}</p>
              {r.response && (
                <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                  <p className="font-medium text-[10px] text-muted-foreground">Réponse:</p>
                  <p>{r.response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SPORT — Commission Sportive : règlement + dates de compétition
// ============================================================

const REGLEMENT_PDF_URL = "/documents/reglement-sportive.pdf"

const REGLEMENT_ARTICLES = [
  "Objet",
  "Participation",
  "Composition des équipes",
  "Engagement des joueurs",
  "Discipline et comportement",
  "Assiduité et ponctualité",
  "Tenue sportive",
  "Arbitrage",
  "Public et supporters",
  "Participation financière",
  "Sanctions",
  "Réclamations",
  "Cas non prévus",
  "Disposition finale",
]

const MY_TEAM_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  SUBMITTED: { label: "Soumise — à valider", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW: { label: "En vérification", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  VALIDATED: { label: "Validée", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RETURNED: { label: "Retournée pour correction", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  REJECTED: { label: "Refusée", cls: "bg-rose-50 text-rose-700 border-rose-200" },
}

const MATCH_PHASE_LABEL: Record<string, string> = {
  POOL: "Poules", QUARTER: "Quart de finale", SEMI: "Demi-finale", FINAL: "Finale",
}

function classLabel(className: string, level: string): string {
  return `${className}${level ? ` · ${level}` : ""}`
}

export function SportTab({ profile, memberId }: { profile: MemberProfile; memberId?: string }) {
  const [delegations, setDelegations] = useState<any[] | null>(null)
  const [competitions, setCompetitions] = useState<any[]>([])
  const [matches, setMatches] = useState<any[] | null>(null)
  const [allTeams, setAllTeams] = useState<any[] | null>(null)
  const [participation, setParticipation] = useState<any | null>(null)
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [playedMatches, setPlayedMatches] = useState<any[]>([])
  const qs = memberId ? `?memberId=${encodeURIComponent(memberId)}` : ""

  // Tous les setState se trouvent dans les callbacks (.then/.catch) :
  // la règle react-hooks/set-state-in-effect l'exige pour les fonctions appelées depuis un effet.
  const load = useCallback(() => {
    Promise.all([
      fetch(`/api/member-space/sport/delegations${qs}`).then((r) => r.json()).catch(() => []),
      fetch("/api/sport/competitions").then((r) => r.json()).catch(() => []),
      fetch("/api/sport/matches").then((r) => r.json()).catch(() => []),
      fetch("/api/sport/teams").then((r) => r.json()).catch(() => []),
      fetch(`/api/member-space/sport/participation${qs}`).then((r) => r.json()).catch(() => ({ mine: [], received: [] })),
    ]).then(([dl, c, m, t, p]) => {
      setDelegations(Array.isArray(dl) ? dl : [])
      const comps = (Array.isArray(c) ? c : []).filter((x: any) => x.status !== "CLOSED")
      setCompetitions(comps)
      setMatches(Array.isArray(m) ? m : [])
      setAllTeams(Array.isArray(t) ? t : [])
      setParticipation(p && typeof p === "object" ? p : { mine: [], received: [] })
      setPlayedMatches((Array.isArray(m) ? m : []).filter((x: any) => x.status === "PLAYED"))
      // Classements des compétitions lancées
      const launched = comps.filter((x: any) => x.status === "LAUNCHED")
      const st: Record<string, any[]> = {}
      const fetchAll = launched.flatMap((comp: any) =>
        (comp.disciplines ?? []).map((cd: any) =>
          fetch(`/api/sport/standings?competitionId=${comp.id}&disciplineId=${cd.disciplineId}`)
            .then((r) => r.json())
            .then((rows) => { if (Array.isArray(rows)) st[cd.disciplineId] = rows })
            .catch(() => {})
        )
      )
      Promise.all(fetchAll).finally(() => setStandings(st))
    })
  }, [qs])

  useEffect(() => { load() }, [load])

  const activeDelegations = (delegations ?? []).filter((d: any) => d.status === "ACTIVE")
  const upcomingMatches = (matches ?? [])
    .filter((m: any) => {
      if (m.status !== "SCHEDULED") return false
      return new Date(m.date).getTime() >= Date.now() - 24 * 60 * 60 * 1000
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const publicTeams = (allTeams ?? []).filter(
    (t: any) => t.status === "SUBMITTED" || t.status === "UNDER_REVIEW" || t.status === "VALIDATED"
  )

  return (
    <div className="p-3 space-y-3">
      {/* En-tête Commission Sportive */}
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <p className="text-sm font-semibold">Commission Sportive</p>
        </div>
        <p className="text-[10px] opacity-80 mt-1">
          Compétitions sportives inter-classes de l'amicale — fair-play, discipline et respect
        </p>
      </div>

      {/* Règlement */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-4 w-4 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Règlement intérieur</p>
            <p className="text-[10px] text-muted-foreground">Compétition Inter-Classes · 14 articles</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="h-8 flex-1 text-xs gap-1.5" asChild>
            <a href={REGLEMENT_PDF_URL} target="_blank" rel="noopener noreferrer">
              <FileText className="h-3.5 w-3.5" /> Lire le PDF
            </a>
          </Button>
          <Button size="sm" className="h-8 flex-1 text-xs gap-1.5" asChild>
            <a href={REGLEMENT_PDF_URL} download>
              <Download className="h-3.5 w-3.5" /> Télécharger
            </a>
          </Button>
        </div>
        <div className="mt-3 border-t pt-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Les 14 articles</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {REGLEMENT_ARTICLES.map((a, i) => (
              <p key={a} className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="truncate">{a}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Mon rôle de responsable sportif de classe */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold">Inscriptions — responsable sportif de classe</p>
        </div>
        {delegations === null ? (
          <p className="text-xs text-muted-foreground p-3 text-center">Chargement…</p>
        ) : delegations.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">
            Vous n'êtes pas désigné responsable sportif de classe pour cette compétition. Les équipes sont gérées par
            le responsable sportif de votre classe, sous l'autorité du responsable des sports de l'Amicale.
          </p>
        ) : (
          <div className="space-y-2">
            {delegations.map((d: any) => (
              <DelegateTeamCard key={d.id} d={d} onChanged={load} />
            ))}
          </div>
        )}
        {activeDelegations.length > 0 && (
          <p className="mt-2 text-[9px] text-muted-foreground">
            Les joueurs sont sélectionnés uniquement parmi les étudiants inscrits de votre classe (art. 2) — aucune saisie manuelle.
          </p>
        )}
      </div>

      {/* Ma participation sportive (étudiant) */}
      <ParticipationSection competitions={competitions} participation={participation} onChanged={load} />

      {/* Dates de compétition */}
      <div className="rounded-lg border bg-card p-3 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold">Dates de compétition</p>
        </div>

        {/* Matchs */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Matchs à venir</p>
          {matches === null ? (
            <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Chargement…</p>
          ) : upcomingMatches.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Aucun match programmé</p>
          ) : (
            <div className="space-y-2">
              {upcomingMatches.map((m: any) => (
                <div key={m.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {MATCH_PHASE_LABEL[m.phase] ?? m.phase}
                    </p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {formatDate(m.date)}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-sm font-medium">
                    <span className="min-w-0 flex-1 truncate text-right">{m.teamA?.name ?? "—"}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">vs</span>
                    <span className="min-w-0 flex-1 truncate">{m.teamB?.name ?? "—"}</span>
                  </div>
                  {m.location && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> {m.location}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Équipes inscrites */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Équipes inscrites</p>
          {allTeams === null ? (
            <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Chargement…</p>
          ) : publicTeams.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Aucune équipe inscrite pour le moment</p>
          ) : (
            <div className="space-y-1.5">
              {publicTeams.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{t.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {t.discipline?.name ?? "—"} · {classLabel(t.className, t.level)}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[9px] ${MY_TEAM_STATUS[t.status]?.cls ?? ""}`}>
                    {MY_TEAM_STATUS[t.status]?.label ?? t.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Résultats */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Résultats des matchs joués</p>
          {playedMatches.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Aucun résultat publié pour le moment</p>
          ) : (
            <div className="space-y-1.5">
              {playedMatches.map((m: any) => (
                <div key={m.id} className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-primary">{MATCH_PHASE_LABEL[m.phase] ?? m.phase}</p>
                  <div className="flex items-center justify-between gap-2 text-sm font-medium mt-0.5">
                    <span className="min-w-0 flex-1 truncate text-right">{m.teamA?.name ?? "—"}</span>
                    <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-bold">
                      {m.scoreA ?? 0} – {m.scoreB ?? 0}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{m.teamB?.name ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Classements */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Classements</p>
          {competitions.filter((a: any) => a.status === "LAUNCHED").length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Le classement sera publié après le lancement officiel des compétitions</p>
          ) : (
            <div className="space-y-2">
              {competitions.filter((a: any) => a.status === "LAUNCHED").map((a: any) => (
                <div key={a.id} className="space-y-2">
                  {(a.disciplines ?? []).map((cd: any) => {
                    const rows = standings[cd.disciplineId] ?? []
                    return (
                      <div key={cd.disciplineId} className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">{a.name} — {cd.discipline?.name}</p>
                        {rows.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">Aucune équipe classée</p>
                        ) : (
                          <div className="space-y-1">
                            {rows.map((r: any, i: number) => (
                              <div key={r.teamId} className="flex items-center gap-2 text-[11px]">
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                                <span className="min-w-0 flex-1 truncate font-medium">{r.teamName}</span>
                                <span className="shrink-0 text-muted-foreground">J{r.played}</span>
                                <span className="shrink-0 text-muted-foreground">G{r.won}</span>
                                <span className="shrink-0 text-muted-foreground">N{r.drawn}</span>
                                <span className="shrink-0 text-muted-foreground">P{r.lost}</span>
                                <span className="shrink-0 text-muted-foreground">+{r.goalsFor}/−{r.goalsAgainst}</span>
                                <span className="w-6 shrink-0 text-right font-bold">{r.points}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compétitions */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Compétitions</p>
          {competitions.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center rounded-lg border">Aucune compétition</p>
          ) : (
            <div className="space-y-2">
              {competitions.map((a: any) => {
                const cStatus =
                  a.status === "OPEN" ? { label: "Inscriptions ouvertes", cls: "bg-cyan-50 text-cyan-700" }
                  : a.status === "LAUNCHED" ? { label: "Lancée", cls: "bg-emerald-50 text-emerald-700" }
                  : a.status === "CLOSED" ? { label: "Clôturée", cls: "bg-neutral-100 text-neutral-700" }
                  : { label: "En préparation", cls: "bg-slate-100 text-slate-700" }
                return (
                  <div key={a.id} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{a.name}</p>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${cStatus.cls}`}>{cStatus.label}</Badge>
                    </div>
                    {a.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                    )}
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        {a.startDate ? formatDate(a.startDate) : "Dates à définir"}
                        {a.endDate && ` → ${formatDate(a.endDate)}`}
                      </p>
                      {a.fee > 0 && (
                        <p className="text-[11px] text-amber-700">Engagement : {a.fee.toLocaleString("fr-FR")} FCFA</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const PARTICIPATION_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ACCEPTED: { label: "Acceptée", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REFUSED: { label: "Refusée", cls: "bg-rose-50 text-rose-700 border-rose-200" },
}

/**
 * Participation sportive d'un étudiant : demande à son responsable de classe
 * (poste obligatoire) + réponses aux sélections directes + demandes reçues si
 * l'étudiant est lui-même responsable de classe.
 */
function ParticipationSection({ competitions, participation, onChanged }: {
  competitions: any[]
  participation: any | null
  onChanged: () => void
}) {
  const openComps = competitions.filter((c: any) => c.status === "OPEN")
  const [applyCompId, setApplyCompId] = useState("")
  const [applyDiscId, setApplyDiscId] = useState("")
  const [applyPosition, setApplyPosition] = useState("")
  const [applyNote, setApplyNote] = useState("")
  const [sending, setSending] = useState(false)

  const applyComp = openComps.find((c: any) => c.id === applyCompId)
  const applyDiscs = (applyComp?.disciplines ?? []).map((cd: any) => cd.discipline)
  const applyDisc = applyDiscs.find((x: any) => x.id === applyDiscId)
  const positionOptions = (applyDisc?.positions ?? []).map((p: any) => p.name)

  async function sendApply() {
    if (!applyCompId) { toast.error("Choisissez une compétition"); return }
    if (!applyDiscId) { toast.error("Choisissez une discipline"); return }
    if (!applyPosition.trim()) { toast.error("Indiquez le poste que vous souhaitez jouer (obligatoire)"); return }
    setSending(true)
    try {
      const res = await fetch("/api/member-space/sport/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId: applyCompId, disciplineId: applyDiscId, position: applyPosition.trim(), note: applyNote.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Demande envoyée au responsable sportif de votre classe")
      setApplyDiscId("")
      setApplyPosition("")
      setApplyNote("")
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function respond(id: string, action: "ACCEPT" | "REFUSE") {
    if (action === "REFUSE" && !confirm("Refuser cette demande ?")) return
    const res = await fetch(`/api/member-space/sport/participation/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(data?.error || "Erreur"); return }
    toast.success(action === "ACCEPT" ? "Demande acceptée — joueur intégré" : "Demande refusée")
    onChanged()
  }

  const mine = participation?.mine ?? []
  const received = participation?.received ?? []
  const receivedPending = received.filter((r: any) => r.status === "PENDING" && r.direction === "STUDENT")
  const myPendingSelection = mine.filter((r: any) => r.status === "PENDING" && r.direction === "DELEGATE")

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold">Ma participation sportive</p>
      </div>

      {participation === null ? (
        <p className="text-xs text-muted-foreground p-3 text-center">Chargement…</p>
      ) : (
        <>
          {/* Formulaire de demande d'un étudiant */}
          {openComps.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-2.5">
              <p className="text-[10px] font-medium text-muted-foreground">
                Envoyer une demande au responsable sportif de ma classe (poste obligatoire)
              </p>
              <div className="space-y-1.5">
                <Select value={applyCompId} onValueChange={(v) => { setApplyCompId(v); setApplyDiscId(""); setApplyPosition("") }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Compétition…" /></SelectTrigger>
                  <SelectContent>
                    {openComps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={applyDiscId} disabled={!applyCompId} onValueChange={(v) => { setApplyDiscId(v); setApplyPosition("") }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Discipline…" /></SelectTrigger>
                  <SelectContent>
                    {(applyComp?.disciplines ?? []).map((cd: any) => (
                      <SelectItem key={cd.disciplineId} value={cd.disciplineId}>{cd.discipline?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {positionOptions.length > 0 ? (
                  <Select value={applyPosition} onValueChange={setApplyPosition}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Poste souhaité…" /></SelectTrigger>
                    <SelectContent>
                      {positionOptions.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="h-9 text-xs" placeholder="Poste souhaité (ex. Gardien) *" value={applyPosition} onChange={(e) => setApplyPosition(e.target.value)} />
                )}
                <Input className="h-9 text-xs" placeholder="Message (optionnel)" value={applyNote} onChange={(e) => setApplyNote(e.target.value)} />
                <Button size="sm" className="h-8 w-full text-xs gap-1.5" onClick={sendApply} disabled={sending}>
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Envoyer ma demande
                </Button>
              </div>
            </div>
          )}

          {/* Sélections directes à accepter/refuser (étudiant) */}
          {myPendingSelection.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">Sélections à confirmer</p>
              {myPendingSelection.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-[11px]">
                  <p className="font-medium">Tu as été sélectionné(e) pour {r.discipline?.name} ({r.competition?.name})</p>
                  <p className="text-muted-foreground mt-0.5">Poste : {r.position} — tant que tu n'acceptes pas, tu n'es pas joueur confirmé.</p>
                  <div className="flex gap-1.5 mt-2">
                    <Button size="sm" className="h-7 flex-1 text-[10px] gap-1" onClick={() => respond(r.id, "ACCEPT")}>
                      <CheckCircle2 className="h-3 w-3" /> Accepter
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 flex-1 text-[10px] gap-1 text-destructive" onClick={() => respond(r.id, "REFUSE")}>
                      <XCircle className="h-3 w-3" /> Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Demandes reçues (responsable de classe) */}
          {receivedPending.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">Demandes de participation reçues ({receivedPending.length})</p>
              {receivedPending.map((r: any) => (
                <div key={r.id} className="rounded-lg border bg-muted/30 p-2.5 text-[11px]">
                  <p className="font-medium">{r.member?.firstName} {r.member?.lastName} <span className="font-mono text-[9px] text-muted-foreground">{r.member?.matricule}</span></p>
                  <p className="text-muted-foreground mt-0.5">{r.discipline?.name} · Poste : {r.position}</p>
                  {r.note && <p className="text-muted-foreground mt-0.5 line-clamp-2">« {r.note} »</p>}
                  <div className="flex gap-1.5 mt-2">
                    <Button size="sm" className="h-7 flex-1 text-[10px] gap-1" onClick={() => respond(r.id, "ACCEPT")}>
                      <CheckCircle2 className="h-3 w-3" /> Accepter
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 flex-1 text-[10px] gap-1 text-destructive" onClick={() => respond(r.id, "REFUSE")}>
                      <XCircle className="h-3 w-3" /> Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mes demandes */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Mes demandes</p>
            {mine.length === 0 ? (
              <p className="text-[10px] text-muted-foreground p-3 text-center rounded-lg border">Aucune demande pour le moment</p>
            ) : (
              <div className="space-y-1.5">
                {mine.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-[11px]">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.discipline?.name} · {r.position}</p>
                      <p className="text-[9px] text-muted-foreground">{r.competition?.name} · {r.direction === "DELEGATE" ? "sélection du responsable" : "ma demande"}</p>
                      {r.status === "REFUSED" && r.response && <p className="text-[9px] text-rose-600 mt-0.5">{r.response}</p>}
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[9px] ${PARTICIPATION_STATUS[r.status]?.cls ?? ""}`}>
                      {PARTICIPATION_STATUS[r.status]?.label ?? r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Carte de gestion d'une délégation (responsable sportif de classe) :
 * compose son équipe uniquement parmi les étudiants inscrits de sa classe,
 * la soumet au responsable des sports, la corrige après un refus.
 */
function DelegateTeamCard({ d, onChanged }: { d: any; onChanged: () => void }) {
  const competition = d.competition
  const disciplines = (competition?.disciplines ?? []).map((x: any) => x.discipline)
  const team = d.team
  const students = d.students ?? []
  const canManage = d.status === "ACTIVE" && competition?.status === "OPEN"

  const [discId, setDiscId] = useState("")
  const [teamName, setTeamName] = useState("")
  const [captainId, setCaptainId] = useState("")
  const [playerIds, setPlayerIds] = useState<string[]>([])
  const [posMap, setPosMap] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)
  // Sélection directe d'un étudiant
  const [directTarget, setDirectTarget] = useState<any | null>(null)
  const [directPosition, setDirectPosition] = useState("")
  const [directSending, setDirectSending] = useState(false)

  const discipline = disciplines.find((x: any) => x.id === discId)
  const maxPlayers = discipline?.maxTeamSize ?? discipline?.teamSize ?? 99
  const minPlayers = discipline?.minTeamSize ?? discipline?.teamSize ?? 0
  const positionOptions = ((d.positionsByDiscipline ?? {})[discId] ?? []) as string[]

  useEffect(() => {
    if (team) {
      setDiscId(team.disciplineId)
      setTeamName(team.name)
      setCaptainId(team.captainId ?? "")
      try {
        setPlayerIds((team.players ? JSON.parse(team.players) : []) as string[])
      } catch {
        setPlayerIds([])
      }
      const pm: Record<string, string> = {}
      for (const p of team.playersDetails ?? []) if (p.position) pm[p.id] = p.position
      setPosMap(pm)
      setEditing(false)
    }
  }, [team])

  const filtered = students.filter((s: any) =>
    !search || s.matricule.includes(search) || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  function togglePlayer(id: string) {
    if (playerIds.includes(id)) {
      setPlayerIds(playerIds.filter((x) => x !== id))
      setPosMap((prev) => { const n = { ...prev }; delete n[id]; return n })
    } else if (playerIds.length < maxPlayers) setPlayerIds([...playerIds, id])
    else toast.error(`Maximum ${maxPlayers} joueur(s) pour cette discipline`)
  }

  function missingPositions(): string[] {
    return playerIds.filter((id) => !(posMap[id] ?? "").trim())
  }

  async function saveDraft() {
    if (!discId) { toast.error("Choisissez une discipline"); return }
    setSaving(true)
    try {
      const payload = {
        competitionId: d.competitionId,
        disciplineId: discId,
        name: teamName,
        captainId: captainId || null,
        playerIds,
        positions: playerIds.length ? posMap : undefined,
      }
      const res = await fetch(team ? `/api/member-space/sport/teams/${team.id}` : "/api/member-space/sport/teams", {
        method: team ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(team ? "Brouillon enregistré" : "Brouillon créé")
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function submitTeam() {
    if (!team) return
    // Vérifications précises avant l'envoi (le serveur contrôle aussi)
    if (playerIds.length < minPlayers) {
      toast.error(`Impossible d'envoyer l'équipe — il manque ${minPlayers - playerIds.length} joueur(s) (minimum requis : ${minPlayers})`)
      return
    }
    if (playerIds.length > maxPlayers) {
      toast.error(`Impossible d'envoyer l'équipe — le nombre maximum de joueurs est dépassé (max ${maxPlayers})`)
      return
    }
    const missing = missingPositions()
    if (missing.length) {
      const m = students.find((s: any) => s.id === missing[0])
      toast.error(`Impossible d'envoyer l'équipe — le poste de ${m ? `${m.firstName} ${m.lastName}` : "un joueur"} n'est pas renseigné`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/member-space/sport/teams/${team.id}/submit`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Équipe soumise — en attente de validation du responsable des sports")
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function removeTeam() {
    if (!team) return
    if (!confirm("Retirer l'inscription ?")) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/member-space/sport/teams?id=${team.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Inscription retirée")
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRemoving(false)
    }
  }

  async function sendDirectSelection() {
    if (!directTarget || !discId) return
    if (!directPosition.trim()) { toast.error("Indiquez le poste du joueur sélectionné"); return }
    setDirectSending(true)
    try {
      const res = await fetch("/api/member-space/sport/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId: d.competitionId,
          disciplineId: discId,
          memberId: directTarget.id,
          position: directPosition.trim(),
          direction: "DELEGATE",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(`Sélection envoyée à ${directTarget.firstName} ${directTarget.lastName} — il doit l'accepter pour être confirmé`)
      setDirectTarget(null)
      setDirectPosition("")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDirectSending(false)
    }
  }

  const st = team ? MY_TEAM_STATUS[team.status] : null
  const needsCorrection = team && (team.status === "RETURNED" || team.status === "REJECTED")

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{classLabel(d.className, d.level)}</p>
          <p className="text-[10px] text-muted-foreground">{competition?.name ?? "—"}</p>
        </div>
        {d.status === "ACTIVE" ? (
          <Badge variant="outline" className="text-[9px] shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">Responsable actif</Badge>
        ) : d.status === "PENDING" ? (
          <Badge variant="outline" className="text-[9px] shrink-0 bg-amber-50 text-amber-700 border-amber-200">À valider</Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] shrink-0 bg-rose-50 text-rose-700 border-rose-200">Révoqué</Badge>
        )}
      </div>

      {!canManage ? (
        <p className="text-[10px] text-muted-foreground mt-2">
          {d.status !== "ACTIVE"
            ? "Votre désignation doit être validée par le responsable des sports de l'Amicale avant de gérer l'équipe."
            : "Les inscriptions ne sont pas ouvertes pour cette compétition."}
        </p>
      ) : team && !editing ? (
        <div className="mt-2 rounded-lg bg-card border p-2.5 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{team.name}</p>
              <p className="text-[10px] text-muted-foreground">{team.discipline?.name ?? "—"} · {classLabel(team.className, team.level)}</p>
            </div>
            {st && <Badge variant="outline" className={`text-[9px] shrink-0 ${st.cls}`}>{st.label}</Badge>}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {team.playersDetails?.length ?? 0}/{maxPlayers} joueur(s) · Capitaine : {team.captainName ?? "—"}
          </p>
          {team.playersDetails && team.playersDetails.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {team.playersDetails.map((p: any) => (
                <span key={p.id} className="rounded border bg-muted/50 px-1.5 py-0.5 text-[9px]">
                  {p.firstName} {p.lastName}{p.position ? ` · ${p.position}` : " · poste ?"}
                </span>
              ))}
            </div>
          )}
          {needsCorrection && team.refusalReason && (
            <div className={`rounded border p-2 text-[10px] ${team.status === "RETURNED" ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
              <p className="font-medium">{team.status === "RETURNED" ? "Retournée pour correction — motif :" : "Refusée — motif :"} {team.refusalReason}</p>
              <p className="mt-0.5">Corrigez l'équipe puis soumettez à nouveau.</p>
            </div>
          )}
          <div className="flex gap-1.5">
            {(team.status === "DRAFT" || needsCorrection) && (
              <Button size="sm" variant="outline" className="h-7 flex-1 text-xs gap-1" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" /> {needsCorrection ? "Corriger" : "Modifier"}
              </Button>
            )}
            {team.status === "DRAFT" && (
              <Button size="sm" className="h-7 flex-1 text-xs gap-1" onClick={submitTeam} disabled={submitting}>
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Soumettre
              </Button>
            )}
            {team.status !== "VALIDATED" && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={removeTeam} disabled={removing}>
                {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="rounded-lg bg-card border p-2.5 text-[11px] text-muted-foreground">
            Classe : <span className="font-medium text-foreground">{classLabel(d.className, d.level)}</span> — joueurs
            sélectionnés uniquement parmi les étudiants inscrits de votre classe (art. 2).
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-medium">Discipline *</Label>
            <Select value={discId} onValueChange={(v) => { setDiscId(v); setCaptainId(""); setPosMap({}) }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {disciplines.length === 0 ? (
                  <p className="px-2 py-2 text-[10px] text-muted-foreground">Aucune discipline dans cette compétition</p>
                ) : disciplines.map((x: any) => (
                  <SelectItem key={x.id} value={x.id}>{x.name} ({x.minTeamSize != null || x.maxTeamSize != null ? `${x.minTeamSize ?? x.teamSize}–${x.maxTeamSize ?? x.teamSize}` : x.teamSize})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-medium">Nom de l'équipe</Label>
            <Input className="h-9 text-xs" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Laissez vide pour « Classe — Discipline »" />
          </div>
          {discipline && (
            <div className="rounded-lg border bg-muted/40 p-2 text-[10px] text-muted-foreground space-y-0.5">
              <p>Règles de composition ({discipline.name}) :</p>
              <p>• Minimum : <span className="font-medium text-foreground">{minPlayers}</span> joueur(s)</p>
              <p>• Maximum : <span className="font-medium text-foreground">{maxPlayers}</span> joueur(s)</p>
              <p>• Actuellement sélectionnés : <span className={`font-medium ${playerIds.length < minPlayers ? "text-amber-600" : "text-emerald-600"}`}>{playerIds.length}</span></p>
              {positionOptions.length > 0 && <p>• Postes : {positionOptions.join(", ")}</p>}
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] font-medium">Joueurs — {playerIds.length}/{maxPlayers}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="h-9 pl-8 text-xs" placeholder="Rechercher un étudiant…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="rounded-lg border max-h-44 overflow-y-auto scroll-thin">
              {filtered.length === 0 ? (
                <p className="p-3 text-[10px] text-muted-foreground text-center">Aucun étudiant actif dans cette classe</p>
              ) : filtered.slice(0, 40).map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-accent text-xs">
                  <label className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={playerIds.includes(s.id)} onChange={() => togglePlayer(s.id)} className="h-3.5 w-3.5 rounded border-input" />
                    <span className="flex-1 truncate">{s.firstName} {s.lastName}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{s.matricule}</span>
                  </label>
                  {!playerIds.includes(s.id) && (
                    <button
                      type="button"
                      onClick={() => { setDirectTarget(s); setDirectPosition("") }}
                      className="shrink-0 rounded border border-primary/30 px-1.5 py-0.5 text-[9px] font-medium text-primary hover:bg-primary/10"
                      title="Sélectionner directement cet étudiant (il devra accepter)"
                    >
                      Sélectionner
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          {playerIds.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[10px] font-medium">Postes des joueurs *</Label>
              <div className="rounded-lg border divide-y divide-border">
                {playerIds.map((pid) => {
                  const s = students.find((x: any) => x.id === pid)
                  const label = s ? `${s.firstName} ${s.lastName}` : pid
                  const missing = !(posMap[pid] ?? "").trim()
                  return (
                    <div key={pid} className="flex items-center gap-2 px-2.5 py-1.5">
                      <span className={`min-w-0 flex-1 truncate text-[11px] ${missing ? "text-amber-600 font-medium" : ""}`}>{label}</span>
                      {positionOptions.length > 0 ? (
                        <Select value={posMap[pid] ?? ""} onValueChange={(v) => setPosMap({ ...posMap, [pid]: v })}>
                          <SelectTrigger className={`h-8 w-36 text-[10px] ${missing ? "border-amber-300" : ""}`}><SelectValue placeholder="Poste…" /></SelectTrigger>
                          <SelectContent>
                            {positionOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input className={`h-8 w-36 text-[10px] ${missing ? "border-amber-300" : ""}`} placeholder="Poste…" value={posMap[pid] ?? ""} onChange={(e) => setPosMap({ ...posMap, [pid]: e.target.value })} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] font-medium">Capitaine (parmi les joueurs)</Label>
            <Select value={captainId} onValueChange={setCaptainId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                {playerIds.map((id) => {
                  const s = students.find((x: any) => x.id === id)
                  return s ? <SelectItem key={id} value={id}>{s.firstName} {s.lastName}</SelectItem> : null
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1.5">
            <Button className="flex-1 h-8 text-xs gap-1.5" onClick={saveDraft} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {team ? "Enregistrer le brouillon" : "Créer le brouillon d'équipe"}
            </Button>
            {team && (
              <Button className="h-8 text-xs" variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
            )}
          </div>
        </div>
      )}

      {/* Sélection directe — choix du poste */}
      <Dialog open={!!directTarget} onOpenChange={(o) => !o && setDirectTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Sélectionner {directTarget ? `${directTarget.firstName} ${directTarget.lastName}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-[11px] text-muted-foreground">Une notification sera envoyée à l'étudiant — il doit accepter pour être considéré comme joueur confirmé.</p>
            {positionOptions.length > 0 ? (
              <Select value={directPosition} onValueChange={setDirectPosition}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Poste…" /></SelectTrigger>
                <SelectContent>
                  {positionOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input className="h-9 text-xs" placeholder="Poste (ex. Gardien)" value={directPosition} onChange={(e) => setDirectPosition(e.target.value)} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDirectTarget(null)}>Annuler</Button>
            <Button onClick={sendDirectSelection} disabled={directSending}>
              {directSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer la sélection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ProfileTab({ profile }: { profile: MemberProfile }) {
  const m = profile.member
  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-20 w-20"><AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials(m.firstName, m.lastName)}</AvatarFallback></Avatar>
        <p className="font-semibold mt-2">{m.firstName} {m.lastName}</p>
        <p className="text-xs text-muted-foreground font-mono">{m.matricule}</p>
        <Badge variant="outline" className="mt-1">{m.status}</Badge>
      </div>

      <div className="rounded-lg border bg-card p-3 space-y-2 text-xs">
        <Row label="Sexe" value={m.sex === "F" ? "Femme" : "Homme"} />
        <Row label="Email" value={m.email ?? "—"} />
        <Row label="Téléphone" value={m.phone ?? "—"} />
        <Row label="Filière" value={m.faculty ?? "—"} />
        <Row label="Filière" value={m.department ?? "—"} />
        <Row label="Niveau" value={m.level ?? "—"} />
        <Row label="Année" value={m.academicYear ?? "—"} />
      </div>

      <div className="rounded-lg border bg-card p-3 flex flex-col items-center">
        <p className="text-xs font-medium text-muted-foreground mb-2">Carte membre — QR Code</p>
        {m.qrCode ? <QrBlock value={m.qrCode} size={140} /> : <p className="text-xs text-muted-foreground">Pas de QR</p>}
        {m.card && (
          <div className="mt-3 text-center w-full">
            <p className="text-[10px] text-muted-foreground">N° carte</p>
            <p className="font-mono text-xs">{m.card.cardNumber}</p>
            {m.card.expiryDate && <p className="text-[10px] text-muted-foreground">Expire le {formatDate(m.card.expiryDate)}</p>}
          </div>
        )}
        <Button size="sm" variant="outline" className="mt-3 w-full h-7 text-xs gap-1.5" onClick={() => window.print()}>
          <FileText className="h-3 w-3" /> Voir ma carte
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}

export function DiscussionTab({ profile }: { profile: MemberProfile }) {
  const meId = profile.member.id
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/member-space/discussion")
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      // silencieux — la liste reste telle quelle
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Rafraîchissement automatique (nouveaux messages des autres membres)
  useEffect(() => {
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  // Défilement vers le bas à chaque nouveau message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/member-space/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      setText("")
      await load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b bg-card px-3 py-2">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold flex-1">Discussion des membres</p>
        <button onClick={load} className="p-1 text-muted-foreground hover:text-primary" title="Actualiser">
          <Loader2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto scroll-thin p-3">
        {loading ? (
          <p className="text-center text-[10px] text-muted-foreground py-6">Chargement…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">Aucun message pour le moment</p>
            <p className="text-[10px] text-muted-foreground/70">Lancez la discussion !</p>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.member?.id === meId
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border rounded-bl-sm"}`}
                >
                  {!mine && (
                    <p className="text-[9px] font-semibold text-primary mb-0.5">
                      {msg.member?.firstName} {msg.member?.lastName}
                    </p>
                  )}
                  <p className="text-xs break-words whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-[9px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t bg-card p-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrivez un message…"
          className="h-9 flex-1 text-xs"
          maxLength={1000}
        />
        <Button type="submit" size="sm" className="h-9 gap-1 px-3" disabled={sending || !text.trim()}>
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Envoyer</span>
        </Button>
      </form>
    </div>
  )
}

// ============================================================
// ACTUALITÉS — centre de diffusion de l'Amicale
// ============================================================

export function NewsTab({ announcements, memberId }: { announcements: Announcement[]; memberId?: string }) {
  const [open, setOpen] = useState<Announcement | null>(null)

  return (
    <div className="p-3 space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <p className="text-sm font-semibold">Actualités de l'Amicale</p>
        </div>
        <p className="text-[10px] opacity-80 mt-1">Annonces, informations sportives, cotisations et activités — diffusées depuis le système de contrôle</p>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-10">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-xs text-muted-foreground">Aucune actualité publiée pour le moment</p>
        </div>
      ) : (
        announcements.map((a) => {
          const cat = ANNOUNCEMENT_CATEGORIES[a.category ?? "GENERAL"] ?? ANNOUNCEMENT_CATEGORIES.GENERAL
          let gallery: string[] = []
          try { gallery = a.gallery ? JSON.parse(a.gallery) : [] } catch { gallery = [] }
          const hasMedia = !!(a.imageUrl || a.videoUrl || a.fileUrl || a.linkUrl || gallery.length)
          return (
            <button
              key={a.id}
              onClick={() => setOpen(a)}
              className={`w-full rounded-lg border bg-card text-left overflow-hidden ${a.pinned ? "border-primary/40 bg-primary/5" : ""}`}
            >
              {a.imageUrl && (
                <img src={a.imageUrl} alt="" className="h-32 w-full object-cover" />
              )}
              <div className="p-3">
                <div className="flex items-center gap-1.5">
                  {a.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${cat.cls}`}>{cat.icon} {cat.label}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{formatDate(a.publishedAt)}</span>
                </div>
                <p className="text-sm font-medium mt-1.5">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                {hasMedia && (
                  <p className="mt-1.5 text-[9px] font-medium text-primary">
                    {gallery.length > 1 ? `🖼 ${gallery.length} images · ` : a.imageUrl ? "🖼 Image · " : ""}
                    {a.videoUrl ? "🎬 Vidéo · " : ""}
                    {a.fileUrl ? "📄 Fichier · " : ""}
                    {a.linkUrl ? "🔗 Lien" : ""}
                    Ouvrir
                  </p>
                )}
              </div>
            </button>
          )
        })
      )}

      {/* Détail de l'actualité */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scroll-thin">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${(ANNOUNCEMENT_CATEGORIES[open.category ?? "GENERAL"] ?? ANNOUNCEMENT_CATEGORIES.GENERAL).cls}`}>
                    {(ANNOUNCEMENT_CATEGORIES[open.category ?? "GENERAL"] ?? ANNOUNCEMENT_CATEGORIES.GENERAL).label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{formatDate(open.publishedAt)}</span>
                </div>
                {open.imageUrl && <img src={open.imageUrl} alt="" className="w-full rounded-lg border object-cover" />}
                {(() => {
                  let gallery: string[] = []
                  try { gallery = open.gallery ? JSON.parse(open.gallery) : [] } catch { gallery = [] }
                  return gallery.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {gallery.map((u, i) => <img key={i} src={u} alt="" className="h-24 w-full rounded-lg border object-cover" />)}
                    </div>
                  ) : null
                })()}
                <p className="text-xs whitespace-pre-wrap leading-relaxed">{open.body}</p>
                {open.videoUrl && <video src={open.videoUrl} controls className="w-full rounded-lg border" />}
                {open.fileUrl && (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" asChild>
                    <a href={open.fileUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-3.5 w-3.5" /> {open.fileName || "Ouvrir le document"}
                    </a>
                  </Button>
                )}
                {open.linkUrl && (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" asChild>
                    <a href={open.linkUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Ouvrir le lien
                    </a>
                  </Button>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(null)}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// NOTIFICATIONS — cloche de l'application étudiante
// ============================================================

interface MemberNotification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  sentAt: string
}

export function NotificationBell({ memberId }: { memberId?: string }) {
  const [items, setItems] = useState<MemberNotification[] | null>(null)
  const [open, setOpen] = useState(false)
  const qs = memberId ? `?memberId=${encodeURIComponent(memberId)}` : ""

  const load = useCallback(() => {
    fetch(`/api/member-space/notifications${qs}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
  }, [qs])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function markAllRead() {
    await fetch(`/api/member-space/notifications${qs}`, { method: "POST" })
    load()
  }

  const unread = (items ?? []).filter((n) => !n.isRead).length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-1.5 hover:bg-primary-foreground/10"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
              {unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] text-primary-foreground">{unread} non lue(s)</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            {items === null ? (
              <p className="text-xs text-muted-foreground text-center py-6">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Aucune notification</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`rounded-lg border p-3 ${n.isRead ? "bg-card" : "bg-primary/5 border-primary/20"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium">{n.title}</p>
                    {!n.isRead && <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">{formatDate(n.sentAt)}</p>
                </div>
              ))
            )}
          </div>
          {items && items.length > 0 && unread > 0 && (
            <DialogFooter>
              <Button size="sm" className="w-full gap-1.5" onClick={markAllRead}>
                <CheckCircle2 className="h-4 w-4" /> Tout marquer comme lu
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
