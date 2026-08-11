"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { ShieldCheck, UserPlus, Lock, Unlock, Search, Filter, History, Eye, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { passwordError, passwordPolicyHint } from "@/lib/sgiau/password-policy"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/sgiau/constants"
import { formatDate, formatDateTime, initials } from "@/lib/sgiau/format"

interface UserItem {
  id: string
  username: string
  email: string
  fullName: string
  role: string
  isActive: boolean
  failedAttempts: number
  lockedUntil: string | null
  lastLoginAt: string | null
  createdAt: string
  member: { matricule: string; firstName: string; lastName: string } | null
  _count: { sessions: number; auditLogs: number }
}

interface SessionEntry {
  id: string
  loginAt: string
  logoutAt: string | null
  ipAddress: string | null
  userAgent: string | null
  success: boolean
}

const ROLES = Object.keys(ROLE_LABELS)

const PERMISSION_MATRIX: { role: string; perms: Record<string, boolean> }[] = [
  { role: "PRESIDENT", perms: { Consulter: true, Ajouter: true, Modifier: true, Supprimer: true, Valider: true, Exporter: true, Imprimer: true } },
  { role: "SECRETAIRE", perms: { Consulter: true, Ajouter: true, Modifier: true, Supprimer: false, Valider: true, Exporter: true, Imprimer: true } },
  { role: "TRESORIER", perms: { Consulter: true, Ajouter: true, Modifier: true, Supprimer: false, Valider: true, Exporter: true, Imprimer: true } },
  { role: "CAISSIER", perms: { Consulter: true, Ajouter: true, Modifier: false, Supprimer: false, Valider: false, Exporter: false, Imprimer: true } },
  { role: "COMMISSAIRE", perms: { Consulter: true, Ajouter: false, Modifier: false, Supprimer: false, Valider: false, Exporter: true, Imprimer: true } },
  { role: "ADMIN_IT", perms: { Consulter: true, Ajouter: true, Modifier: true, Supprimer: true, Valider: true, Exporter: true, Imprimer: true } },
  { role: "MEMBER", perms: { Consulter: true, Ajouter: false, Modifier: false, Supprimer: false, Valider: false, Exporter: false, Imprimer: false } },
  { role: "CUSTOM", perms: { Consulter: true, Ajouter: false, Modifier: false, Supprimer: false, Valider: false, Exporter: false, Imprimer: false } },
]

const PERM_KEYS = ["Consulter", "Ajouter", "Modifier", "Supprimer", "Valider", "Exporter", "Imprimer"]

const emptyForm = { fullName: "", username: "", email: "", role: "MEMBER", password: "", memberId: "" }

export default function UsersModule() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, locked: 0, sessionsToday: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [role, setRole] = useState("ALL")

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [sessionsTarget, setSessionsTarget] = useState<UserItem | null>(null)
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (role !== "ALL") params.set("role", role)
    const res = await fetch(`/api/users?${params}`)
    const data = await res.json()
    setUsers(data.items || [])
    setStats(data.stats || { total: 0, active: 0, locked: 0, sessionsToday: 0 })
    setLoading(false)
  }, [q, role])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.fullName || !form.username || !form.email || !form.password) {
      toast.error("Tous les champs sont requis")
      return
    }
    const pwError = passwordError(form.password)
    if (pwError) {
      toast.error(pwError)
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Utilisateur créé")
      setFormOpen(false)
      setForm(emptyForm)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(u: UserItem) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    if (res.ok) {
      toast.success(u.isActive ? "Utilisateur désactivé" : "Utilisateur activé")
      load()
    } else toast.error("Échec")
  }

  async function unlock(u: UserItem) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unlock: true }),
    })
    if (res.ok) {
      toast.success("Compte déverrouillé")
      load()
    } else toast.error("Échec")
  }

  async function changeRole(u: UserItem, newRole: string) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      toast.success("Rôle modifié")
      load()
    } else toast.error("Échec")
  }

  async function viewSessions(u: UserItem) {
    setSessionsTarget(u)
    setSessionsOpen(true)
    setSessionsLoading(true)
    try {
      const res = await fetch(`/api/users/${u.id}/sessions`)
      const data = await res.json()
      setSessions(data || [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs & Sécurité"
        description="Comptes, rôles, verrouillages et sessions"
        icon={ShieldCheck}
        actions={
          <Button size="sm" onClick={() => { setForm(emptyForm); setFormOpen(true) }} className="gap-2">
            <UserPlus className="h-4 w-4" /> Nouvel utilisateur
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total utilisateurs" value={stats.total} icon={ShieldCheck} />
        <StatCard title="Actifs" value={stats.active} icon={UserPlus} tone="success" />
        <StatCard title="Verrouillés" value={stats.locked} icon={Lock} tone="warning" />
        <StatCard title="Sessions aujourd'hui" value={stats.sessionsToday} icon={History} tone="info" />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom, username, email…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full sm:w-52"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Rôle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les rôles</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : users.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aucun utilisateur" description="Aucun utilisateur ne correspond à vos filtres." />
        ) : (
          <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="hidden md:table-cell">Dernière connexion</TableHead>
                  <TableHead className="hidden lg:table-cell">Compte</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date()
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(u.fullName.split(" ")[0], u.fullName.split(" ")[1])}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">@{u.username} · {u.email}</p>
                            {u.member && <p className="text-[10px] text-muted-foreground">Membre: {u.member.matricule}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => changeRole(u, v)}>
                          <SelectTrigger className="h-8 w-44"><Badge variant="outline" className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Jamais"}
                        {u.failedAttempts > 0 && <p className="text-amber-600">{u.failedAttempts} tentative(s) échouée(s)</p>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} />
                          <span className="text-xs">{u.isActive ? "Actif" : "Inactif"}</span>
                          {isLocked && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 ml-1"><Lock className="h-3 w-3 mr-1" />Verrouillé</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isLocked && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Déverrouiller" onClick={() => unlock(u)}>
                              <Unlock className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Sessions" onClick={() => viewSessions(u)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Roles & permissions matrix */}
      <SectionCard title="Rôles & permissions" description="Matrice de référence des permissions par rôle (affichage statique)">
        <div className="rounded-lg border overflow-x-auto scroll-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Rôle</TableHead>
                {PERM_KEYS.map((p) => <TableHead key={p} className="text-center">{p}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MATRIX.map((row) => (
                <TableRow key={row.role}>
                  <TableCell><Badge variant="outline" className={ROLE_COLORS[row.role]}>{ROLE_LABELS[row.role]}</Badge></TableCell>
                  {PERM_KEYS.map((p) => (
                    <TableCell key={p} className="text-center">
                      {row.perms[p] ? (
                        <span className="text-emerald-600 text-base">✓</span>
                      ) : (
                        <span className="text-muted-foreground/40 text-base">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Create user dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2">
            <Field label="Nom complet *"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Nom d'utilisateur *"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Rôle">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Mot de passe *">
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">{passwordPolicyHint()}</p>
            </Field>
            <Field label="Matricule membre (optionnel)"><Input value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} placeholder="Lier à un membre existant" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Création…" : "Créer l'utilisateur"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sessions sheet */}
      <Sheet open={sessionsOpen} onOpenChange={(o) => { setSessionsOpen(o); if (!o) { setSessionsTarget(null); setSessions([]) } }}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto scroll-thin">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Sessions de {sessionsTarget?.fullName}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 mt-4">
            {sessionsLoading ? (
              <LoadingState rows={4} />
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatDateTime(s.loginAt)}</span>
                      <Badge variant="outline" className={s.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>{s.success ? "Succès" : "Échec"}</Badge>
                    </div>
                    {s.ipAddress && <p className="text-xs text-muted-foreground mt-1">IP: {s.ipAddress}</p>}
                    {s.userAgent && <p className="text-xs text-muted-foreground truncate">{s.userAgent}</p>}
                    {s.logoutAt && <p className="text-xs text-muted-foreground">Déconnexion: {formatDateTime(s.logoutAt)}</p>}
                  </div>
                ))}
              </div>
            )}
            {sessionsTarget && (
              <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
                <KeyRound className="h-3 w-3" />
                Créé le {formatDate(sessionsTarget.createdAt)} · {sessionsTarget._count.auditLogs} action(s) audit
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
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
