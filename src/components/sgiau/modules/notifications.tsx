"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { Bell, Send, CheckCheck, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/sgiau/format"

interface NotifItem {
  id: string
  title: string
  message: string
  channel: string
  type: string
  isRead: boolean
  sentAt: string
  userId: string | null
  memberId: string | null
}

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  REMINDER: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  PAYMENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  MEETING: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  ACTIVITY: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200",
}

const CHANNEL_LABELS: Record<string, string> = {
  APP: "App",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
}

interface SimpleUser { id: string; fullName: string; username: string }
interface SimpleMember { id: string; matricule: string; firstName: string; lastName: string }

const emptyForm = { audience: "member", audienceId: "", title: "", message: "", channel: "APP", type: "INFO" }

export default function NotificationsModule() {
  const [items, setItems] = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const [users, setUsers] = useState<SimpleUser[]>([])
  const [members, setMembers] = useState<SimpleMember[]>([])
  const [recipientSearch, setRecipientSearch] = useState("")

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?${unreadOnly ? "unread=1" : ""}`)
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [unreadOnly])

  const loadRecipients = useCallback(async () => {
    const [u, m] = await Promise.all([
      fetch("/api/users?limit=500").then((r) => r.json()),
      fetch("/api/members?limit=500").then((r) => r.json()),
    ])
    setUsers(u.items?.map((x: any) => ({ id: x.id, fullName: x.fullName, username: x.username })) || [])
    setMembers(m.map((x: any) => ({ id: x.id, matricule: x.matricule, firstName: x.firstName, lastName: x.lastName })) || [])
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadRecipients() }, [loadRecipients])

  async function markAllRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    })
    if (res.ok) {
      toast.success("Toutes les notifications marquées comme lues")
      load()
    } else toast.error("Échec")
  }

  async function markRead(id: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) load()
  }

  async function send() {
    if (!form.title || !form.message || !form.audienceId) {
      toast.error("Tous les champs sont requis")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success("Notification envoyée")
      setForm(emptyForm)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const recipients = form.audience === "user"
    ? users.filter((u) => !recipientSearch || u.fullName.toLowerCase().includes(recipientSearch.toLowerCase()) || u.username.toLowerCase().includes(recipientSearch.toLowerCase()))
    : members.filter((m) => !recipientSearch || m.matricule.includes(recipientSearch) || `${m.firstName} ${m.lastName}`.toLowerCase().includes(recipientSearch.toLowerCase()))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Notifications envoyées et reçues, multi-canal (App, WhatsApp, Email)"
        icon={Bell}
      />

      <Tabs defaultValue="received">
        <TabsList>
          <TabsTrigger value="received" className="gap-2"><Bell className="h-4 w-4" /> Reçues</TabsTrigger>
          <TabsTrigger value="send" className="gap-2"><Send className="h-4 w-4" /> Envoyer</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          <SectionCard
            title="Notifications reçues"
            description={`${items.length} notification(s)`}
            actions={
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
                  Non lues seulement
                </label>
                <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
                  <CheckCheck className="h-4 w-4" /> Tout marquer lu
                </Button>
              </div>
            }
          >
            {loading ? (
              <LoadingState rows={6} />
            ) : items.length === 0 ? (
              <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour !" />
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto scroll-thin">
                {items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.isRead && markRead(n.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent ${!n.isRead ? "border-primary/40 bg-primary/5" : "opacity-70"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{n.title}</p>
                          <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[n.type] ?? ""}`}>{n.type}</Badge>
                          <Badge variant="outline" className="text-[10px]">{CHANNEL_LABELS[n.channel] ?? n.channel}</Badge>
                          {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.sentAt)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="send" className="mt-4">
          <SectionCard title="Envoyer une notification" description="À un utilisateur ou un membre, via le canal de votre choix">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <Field label="Destinataire">
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v, audienceId: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membre</SelectItem>
                    <SelectItem value="user">Utilisateur (staff)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Canal">
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APP">App (in-app)</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">Rechercher un destinataire</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={form.audience === "user" ? "Nom, username…" : "Matricule, nom…"}
                    className="pl-9"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="rounded-lg border max-h-48 overflow-y-auto scroll-thin">
                  {recipients.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">Aucun destinataire</p>
                  ) : recipients.slice(0, 50).map((r: any) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setForm({ ...form, audienceId: r.id })}
                      className={`w-full text-left p-2 text-sm hover:bg-accent transition-colors border-b last:border-0 ${form.audienceId === r.id ? "bg-primary/10" : ""}`}
                    >
                      {form.audience === "user"
                        ? <>{r.fullName} <span className="text-xs text-muted-foreground">@{r.username}</span></>
                        : <>{r.firstName} {r.lastName} <span className="text-xs text-muted-foreground font-mono">{r.matricule}</span></>}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Type">
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Information</SelectItem>
                    <SelectItem value="REMINDER">Rappel</SelectItem>
                    <SelectItem value="PAYMENT">Paiement</SelectItem>
                    <SelectItem value="MEETING">Réunion</SelectItem>
                    <SelectItem value="ACTIVITY">Activité</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Titre">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Rappel cotisation" />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Message">
                  <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Votre message…" />
                </Field>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setForm(emptyForm)}>Réinitialiser</Button>
                <Button onClick={send} disabled={saving} className="gap-2">
                  <Send className="h-4 w-4" /> {saving ? "Envoi…" : "Envoyer"}
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
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
