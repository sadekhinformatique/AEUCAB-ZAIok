"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { ClipboardCheck, CalendarDays, UsersRound, QrCode, Download, ScanLine, Check, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatDateTime, toCSV, downloadCSV } from "@/lib/sgiau/format"

interface Member { id: string; matricule: string; firstName: string; lastName: string }
interface Activity { id: string; name: string; startDate: string; _count?: { participants: number } }
interface Meeting { id: string; title: string; startDate: string; _count?: { participants: number } }
interface Presence {
  id: string
  memberId: string
  scope: string
  scopeId: string
  method: string
  checkInAt: string
  member: { id: string; matricule: string; firstName: string; lastName: string; faculty: string | null }
}

const METHOD_LABELS: Record<string, string> = { MANUAL: "Manuel", QR: "QR Code" }

export default function PresencesModule() {
  const [tab, setTab] = useState("activity")

  // Shared data
  const [activities, setActivities] = useState<Activity[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [members, setMembers] = useState<Member[]>([])

  // Par activité
  const [activityId, setActivityId] = useState("")
  const [activityPresences, setActivityPresences] = useState<Presence[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  // Par réunion
  const [meetingId, setMeetingId] = useState("")
  const [meetingParticipants, setMeetingParticipants] = useState<any[]>([])
  const [meetingLoading, setMeetingLoading] = useState(false)

  // Marquer
  const [scope, setScope] = useState<"ACTIVITY" | "MEETING">("ACTIVITY")
  const [scopeId, setScopeId] = useState("")
  const [memberInput, setMemberInput] = useState("")
  const [method, setMethod] = useState<"MANUAL" | "QR">("MANUAL")
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [a, m, mb] = await Promise.all([
        fetch("/api/activities?limit=200").then((r) => r.json()),
        fetch("/api/meetings?limit=200").then((r) => r.json()),
        fetch("/api/members?limit=500").then((r) => r.json()),
      ])
      setActivities(a)
      setMeetings(m)
      setMembers(mb)
      if (a[0]) { setActivityId(a[0].id); setScopeId(a[0].id) }
      if (m[0]) setMeetingId(m[0].id)
    })()
  }, [])

  const loadActivityPresences = useCallback(async () => {
    if (!activityId) return
    setActivityLoading(true)
    const res = await fetch(`/api/presences?scope=ACTIVITY&scopeId=${activityId}`)
    const data = await res.json()
    setActivityPresences(data)
    setActivityLoading(false)
  }, [activityId])

  useEffect(() => { if (tab === "activity") loadActivityPresences() }, [tab, loadActivityPresences])

  const loadMeetingParticipants = useCallback(async () => {
    if (!meetingId) return
    setMeetingLoading(true)
    const res = await fetch(`/api/meetings/${meetingId}`)
    const data = await res.json()
    setMeetingParticipants(data.participants ?? [])
    setMeetingLoading(false)
  }, [meetingId])

  useEffect(() => { if (tab === "meeting") loadMeetingParticipants() }, [tab, loadMeetingParticipants])

  async function toggleMeetingAttended(p: any, attended: boolean) {
    const res = await fetch(`/api/meetings/${meetingId}/participants/${p.memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended }),
    })
    if (res.ok) {
      toast.success(attended ? "Présence enregistrée" : "Marqué absent")
      loadMeetingParticipants()
    } else toast.error("Échec")
  }

  async function checkIn(memberId?: string, mMethod: "MANUAL" | "QR" = method) {
    const targetScope = scope
    const targetId = scope === "ACTIVITY" ? scopeId : (scope === "MEETING" ? scopeId : "")
    if (!targetId) { toast.error("Sélectionnez une activité ou une réunion"); return }
    // Resolve memberId from input
    let mId = memberId
    if (!mId) {
      const input = memberInput.trim().toLowerCase()
      const m = members.find((x) => x.matricule.toLowerCase() === input || `${x.firstName} ${x.lastName}`.toLowerCase() === input || x.id === memberInput)
      if (!m) { toast.error("Membre introuvable"); return }
      mId = m.id
    }
    setChecking(true)
    try {
      const res = await fetch("/api/presences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: mId, scope: targetScope, scopeId: targetId, method: mMethod }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(`Présence enregistrée — ${data.member?.firstName ?? ""} ${data.member?.lastName ?? ""}`)
      setMemberInput("")
      if (targetScope === "ACTIVITY" && targetId === activityId) loadActivityPresences()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setChecking(false)
    }
  }

  async function simulateQRScan() {
    if (!scopeId) { toast.error("Sélectionnez une cible"); return }
    if (members.length === 0) { toast.error("Aucun membre disponible"); return }
    // Pick a random member not yet checked in
    const checked = new Set(activityPresences.map((p) => p.memberId))
    const candidates = members.filter((m) => !checked.has(m.id))
    if (candidates.length === 0) { toast.info("Tous les membres sont déjà enregistrés"); return }
    const random = candidates[Math.floor(Math.random() * candidates.length)]
    await checkIn(random.id, "QR")
  }

  function exportCSV() {
    if (tab === "activity") {
      const rows = activityPresences.map((p) => ({
        matricule: p.member.matricule, nom: `${p.member.firstName} ${p.member.lastName}`,
        methode: METHOD_LABELS[p.method] ?? p.method, heure: formatDateTime(p.checkInAt),
      }))
      const a = activities.find((x) => x.id === activityId)
      downloadCSV(`presences-activite-${a?.name ?? activityId}.csv`, toCSV(rows))
      toast.success(`${rows.length} présences exportées`)
    } else if (tab === "meeting") {
      const rows = meetingParticipants.map((p: any) => ({
        matricule: p.member.matricule, nom: `${p.member.firstName} ${p.member.lastName}`,
        present: p.attended ? "OUI" : "NON",
      }))
      const m = meetings.find((x) => x.id === meetingId)
      downloadCSV(`presences-reunion-${m?.title ?? meetingId}.csv`, toCSV(rows))
      toast.success(`${rows.length} participants exportés`)
    }
  }

  const activityRate = activities.find((a) => a.id === activityId)
  const activityParticipantCount = activityRate?._count?.participants ?? 0
  const activityPresentCount = activityPresences.length
  const activityRatePct = activityParticipantCount > 0 ? Math.round((activityPresentCount / activityParticipantCount) * 100) : 0

  const meetingPresent = meetingParticipants.filter((p: any) => p.attended).length
  const meetingRatePct = meetingParticipants.length > 0 ? Math.round((meetingPresent / meetingParticipants.length) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Présences"
        description="Pointage par activité, par réunion, et scan QR simulé"
        icon={ClipboardCheck}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Exporter CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Activités suivies" value={activities.length} icon={CalendarDays} />
        <StatCard title="Réunions suivies" value={meetings.length} icon={UsersRound} />
        <StatCard title="Pointages (activité)" value={activityPresences.length} icon={UserCheck} tone="success" />
        <StatCard title="Taux (activité courante)" value={`${activityRatePct}%`} icon={ClipboardCheck} tone="info" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="activity" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Par activité</TabsTrigger>
          <TabsTrigger value="meeting" className="gap-1.5"><UsersRound className="h-4 w-4" /> Par réunion</TabsTrigger>
          <TabsTrigger value="checkin" className="gap-1.5"><ScanLine className="h-4 w-4" /> Marquer</TabsTrigger>
        </TabsList>

        {/* TAB: Par activité */}
        <TabsContent value="activity" className="mt-4">
          <SectionCard
            title="Présences par activité"
            actions={
              <Select value={activityId} onValueChange={(v) => { setActivityId(v); setScopeId(v); setScope("ACTIVITY") }}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Choisir une activité" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {activities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            }
          >
            {!activityId ? (
              <EmptyState icon={CalendarDays} title="Aucune activité sélectionnée" description="Sélectionnez une activité dans la liste déroulante." />
            ) : activityLoading ? (
              <LoadingState rows={5} />
            ) : (
              <>
                <div className="flex flex-wrap gap-3 mb-4 text-sm">
                  <Badge variant="outline" className="bg-primary/10 text-primary">Taux de présence : <strong className="ml-1">{activityRatePct}%</strong></Badge>
                  <Badge variant="outline">Présents : {activityPresentCount}</Badge>
                  <Badge variant="outline">Inscrits : {activityParticipantCount}</Badge>
                </div>
                {activityPresences.length === 0 ? (
                  <EmptyState icon={ClipboardCheck} title="Aucun pointage" description="Aucune présence enregistrée pour cette activité." />
                ) : (
                  <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead>Membre</TableHead>
                          <TableHead>Matricule</TableHead>
                          <TableHead className="hidden md:table-cell">Heure d'arrivée</TableHead>
                          <TableHead>Méthode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityPresences.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.member.firstName} {p.member.lastName}</TableCell>
                            <TableCell className="font-mono text-xs">{p.member.matricule}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{formatDateTime(p.checkInAt)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={p.method === "QR" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : ""}>
                                {p.method === "QR" ? <QrCode className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                {METHOD_LABELS[p.method] ?? p.method}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        </TabsContent>

        {/* TAB: Par réunion */}
        <TabsContent value="meeting" className="mt-4">
          <SectionCard
            title="Présences par réunion"
            actions={
              <Select value={meetingId} onValueChange={(v) => { setMeetingId(v); setScopeId(v); setScope("MEETING") }}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Choisir une réunion" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {meetings.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select>
            }
          >
            {!meetingId ? (
              <EmptyState icon={UsersRound} title="Aucune réunion sélectionnée" description="Sélectionnez une réunion dans la liste déroulante." />
            ) : meetingLoading ? (
              <LoadingState rows={5} />
            ) : (
              <>
                <div className="flex flex-wrap gap-3 mb-4 text-sm">
                  <Badge variant="outline" className="bg-primary/10 text-primary">Taux : <strong className="ml-1">{meetingRatePct}%</strong></Badge>
                  <Badge variant="outline">Présents : {meetingPresent}</Badge>
                  <Badge variant="outline">Participants : {meetingParticipants.length}</Badge>
                </div>
                {meetingParticipants.length === 0 ? (
                  <EmptyState icon={UsersRound} title="Aucun participant" description="Ajoutez des participants à cette réunion." />
                ) : (
                  <div className="rounded-lg border max-h-[60vh] overflow-auto scroll-thin">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead>Membre</TableHead>
                          <TableHead>Matricule</TableHead>
                          <TableHead className="hidden md:table-cell">Filière</TableHead>
                          <TableHead className="text-center">Présent</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {meetingParticipants.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.member.firstName} {p.member.lastName}</TableCell>
                            <TableCell className="font-mono text-xs">{p.member.matricule}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{p.member.faculty ?? "—"}</TableCell>
                            <TableCell className="text-center">
                              {p.attended ? (
                                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Check className="h-3 w-3 mr-1" /> Présent</Badge>
                              ) : (
                                <Badge variant="outline">Absent</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant={p.attended ? "outline" : "default"} onClick={() => toggleMeetingAttended(p, !p.attended)}>
                                {p.attended ? "Marquer absent" : "Marquer présent"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        </TabsContent>

        {/* TAB: Marquer */}
        <TabsContent value="checkin" className="mt-4">
          <SectionCard title="Pointage rapide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Scope</Label>
                  <Select value={scope} onValueChange={(v) => { setScope(v as "ACTIVITY" | "MEETING"); setScopeId("") }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVITY">Activité</SelectItem>
                      <SelectItem value="MEETING">Réunion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">{scope === "ACTIVITY" ? "Activité" : "Réunion"}</Label>
                  <Select value={scopeId} onValueChange={setScopeId}>
                    <SelectTrigger><SelectValue placeholder={`Choisir une ${scope === "ACTIVITY" ? "activité" : "réunion"}`} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {scope === "ACTIVITY"
                        ? activities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)
                        : meetings.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Membre (matricule, nom complet ou ID)</Label>
                  <Input value={memberInput} onChange={(e) => setMemberInput(e.target.value)} placeholder="Ex : 2024-0001 ou Jean Dupont" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Méthode</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as "MANUAL" | "QR")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manuel</SelectItem>
                      <SelectItem value="QR">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full gap-2" onClick={() => checkIn()} disabled={checking || !scopeId}>
                  <Check className="h-4 w-4" /> {checking ? "Pointage…" : "Enregistrer la présence"}
                </Button>
              </div>

              <div className="border-l-0 md:border-l md:pl-4">
                <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <ScanLine className="h-5 w-5 text-primary" />
                    <p className="font-medium">Scan QR simulé</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Simule le scan d'un badge membre pour enregistrer une présence par QR code. Un membre aléatoire non encore pointé sera sélectionné.
                  </p>
                  <Button variant="outline" className="w-full gap-2" onClick={simulateQRScan} disabled={checking || !scopeId || members.length === 0}>
                    <QrCode className="h-4 w-4" /> Scanner un QR
                  </Button>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
