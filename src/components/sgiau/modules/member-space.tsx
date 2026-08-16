"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { PageHeader, SectionCard, EmptyState, LoadingState, Money } from "@/components/sgiau/ui"
import {
  Smartphone, Home, Wallet, FileText, Send, User, LogOut, Pin, CheckCircle2,
  AlertCircle, Download, ChevronRight, Bell, Search, MessageSquare, Loader2,
  Trophy, CalendarDays, MapPin, Clock,
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

export interface Announcement { id: string; title: string; body: string; pinned: boolean; publishedAt: string }

export const REQUEST_TYPES: Record<string, string> = {
  CERTIFICATE: "Attestation / Certificat",
  RECEIPT: "Reçu",
  CARD_RENEWAL: "Renouvellement de carte",
  OTHER: "Autre",
}

export type Tab = "home" | "payments" | "documents" | "requests" | "discussion" | "sport" | "profile"

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
                <button onClick={disconnect} className="rounded-lg p-1.5 hover:bg-primary-foreground/10" title="Déconnexion">
                  <LogOut className="h-4 w-4" />
                </button>
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
                {tab === "discussion" && (
                  <DiscussionTab profile={profile} />
                )}
                {tab === "sport" && (
                  <SportTab profile={profile} />
                )}
                {tab === "profile" && (
                  <ProfileTab profile={profile} />
                )}
              </div>

              {/* Bottom tabs */}
              <div className="grid grid-cols-7 border-t bg-card">
                {([
                  { key: "home", label: "Accueil", icon: Home },
                  { key: "payments", label: "Cotis.", icon: Wallet },
                  { key: "documents", label: "Docs", icon: FileText },
                  { key: "requests", label: "Demandes", icon: Send },
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
        <p className="text-xs font-medium text-muted-foreground mb-2">Annonces</p>
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

// Compétitions sportives = activités dont le nom/description/lieu évoque le sport
const SPORT_KEYWORDS = [
  "sport", "foot", "basket", "volley", "hand", "match", "tournoi",
  "compétition", "competition", "inter-classe", "interclasse", "inter classe",
  "athlétisme", "athletisme", "judo", "karaté", "karate", "tennis", "badminton",
]

function isSportActivity(a: any): boolean {
  const hay = `${a.name ?? ""} ${a.description ?? ""} ${a.location ?? ""}`.toLowerCase()
  return SPORT_KEYWORDS.some((k) => hay.includes(k))
}

export function SportTab({ profile }: { profile: MemberProfile }) {
  const [competitions, setCompetitions] = useState<any[] | null>(null)

  // Tous les setState se trouvent dans les callbacks (.then/.catch) :
  // la règle react-hooks/set-state-in-effect l'exige pour les fonctions appelées depuis un effet.
  const load = useCallback(() => {
    fetch("/api/activities?limit=100")
      .then((r) => r.json())
      .then((data) => {
        const now = Date.now()
        const upcoming = (Array.isArray(data) ? data : []).filter((a: any) => {
          // Uniquement les compétitions sportives à venir ou en cours
          if (a.status !== "PLANNED" && a.status !== "ONGOING") return false
          if (!isSportActivity(a)) return false
          const start = new Date(a.startDate).getTime()
          const end = a.endDate ? new Date(a.endDate).getTime() : start
          return end >= now - 24 * 60 * 60 * 1000
        })
        upcoming.sort((x: any, y: any) => new Date(x.startDate).getTime() - new Date(y.startDate).getTime())
        setCompetitions(upcoming)
      })
      .catch(() => setCompetitions([]))
  }, [])

  useEffect(() => { load() }, [load])

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

      {/* Dates de compétition */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold">Dates de compétition</p>
        </div>
        {competitions === null ? (
          <p className="text-xs text-muted-foreground p-3 text-center">Chargement…</p>
        ) : competitions.length === 0 ? (
          <div className="text-center py-5">
            <Trophy className="mx-auto h-6 w-6 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">Aucune compétition programmée</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              Les compétitions de la Commission Sportive apparaîtront ici dès qu'elles seront planifiées
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {competitions.map((a: any) => {
              const start = new Date(a.startDate)
              const ongoing = a.status === "ONGOING"
              return (
                <div key={a.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{a.name}</p>
                    {ongoing && (
                      <Badge variant="outline" className="text-[9px] shrink-0 bg-emerald-50 text-emerald-700">
                        En cours
                      </Badge>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                  )}
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0" /> {formatDate(a.startDate)}
                      {a.endDate && a.endDate !== a.startDate && ` → ${formatDate(a.endDate)}`}
                    </p>
                    {a.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" /> {a.location}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
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

// silence unused import warning for SectionCard / EmptyState / Bell / formatDateTime
void SectionCard
void EmptyState
void Bell
void formatDateTime
