"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Coins,
  DoorOpen,
  Gavel,
  Image as ImageIcon,
  Lock,
  Loader2,
  LockOpen,
  Megaphone,
  Plus,
  Receipt,
  Swords,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "../router";
import { useApiData } from "../data-hooks";
import {
  BackButton,
  ComplaintStatusBadge,
  ComplaintTypeBadge,
  EmptyState,
  LoadingRows,
  MatchStatusBadge,
  PenaltyTypeBadge,
  PaymentStatusBadge,
  PrizeStatusBadge,
  RegistrationStatusBadge,
  SectionHeader,
  StatCard,
  TeamLogo,
  TournamentStatusBadge,
} from "../shared/kit";
import { ConfirmDialog } from "../shared/copy-field";
import { LeaderboardTable, type LeaderboardRowData } from "../shared/leaderboard";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTime, formatMoney, formatTime, timeAgo } from "@/lib/format";
import { MAPS, GAME_MODES, PENALTY_TYPES, TOURNAMENT_STATUS_LABELS, TOURNAMENT_STATUSES, type RuleSection } from "@/lib/types";
import { cn } from "@/lib/utils";

type ControlCenterData = {
  tournament: {
    id: string;
    slug: string;
    name: string;
    status: string;
    resultsLocked: boolean;
    entryFee: number;
    teamLimit: number;
    playersPerTeam: number;
    matchCount: number;
    prizePool: number;
    scoringConfig: { placementPoints: Record<string, number>; killPoint: number };
    rules: RuleSection[];
    prizeConfig: { name: string; amount: number; description?: string }[];
  };
  stats: {
    teams: number;
    verified: number;
    pending: number;
    matches: number;
    completed: number;
    currentMatchNumber: number | null;
    complaints: number;
    pendingComplaints: number;
    pendingPayments: number;
    announcements: number;
  };
  registrations: {
    id: string;
    regId: string;
    status: string;
    submittedAt: string;
    reviewNote: string | null;
    team: {
      id: string;
      name: string;
      logoUrl: string | null;
      status: string;
      captainName: string;
      captainEmail: string;
      playerCount: number;
      players: { ign: string; uid: string; role: string; status: string; isSubstitute: boolean }[];
    };
    payment: {
      id: string;
      method: string;
      transactionId: string;
      senderNumber: string;
      screenshotUrl: string | null;
      status: string;
      amount: number;
      rejectionReason: string | null;
    } | null;
  }[];
  matches: {
    id: string;
    matchNumber: number;
    date: string;
    map: string;
    mode: string;
    status: string;
    roomId: string | null;
    roomPassword: string | null;
    roomReleaseAt: string | null;
    roomPublished: boolean;
    resultPublished: boolean;
    resultsCount: number;
  }[];
  approvedTeams: { id: string; name: string; logoUrl: string | null; captainName: string; players: { id: string; ign: string; uid: string; role: string; status: string; isSubstitute: boolean }[] }[];
  complaints: {
    id: string;
    ticketId: string;
    type: string;
    description: string;
    status: string;
    internalNotes: string | null;
    createdAt: string;
    team: { name: string };
    evidence: { id: string; url: string; name: string | null }[];
  }[];
  announcements: { id: string; title: string; description: string; priority: string; publishAt: string }[];
  penalties: { id: string; type: string; value: number; reason: string; active: boolean; createdAt: string; team: { name: string } | null; issuer: { name: string } }[];
  prizes: { id: string; name: string; amount: number; status: string; winnerTeamId: string | null }[];
  leaderboard: LeaderboardRowData[];
};

export function ControlCenter({ idOrSlug }: { idOrSlug: string }) {
  const { navigate } = useRouter();
  const { data, loading, error, refetch } = useApiData<ControlCenterData>(
    `/api/tournaments/${idOrSlug}/control-center`,
    { refreshMs: 30_000 }
  );
  const [tab, setTab] = useState("overview");

  if (loading) return <LoadingRows count={4} />;
  if (error || !data) {
    return (
      <EmptyState
        icon={<Trophy className="h-10 w-10" />}
        title="Tournament not found"
        description={error ?? "Cannot load this tournament."}
        action={<Button onClick={() => navigate("/admin/tournaments")}>Back to tournaments</Button>}
      />
    );
  }

  const { tournament: t, stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <BackButton onClick={() => navigate("/admin/tournaments")} label="All tournaments" />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl font-bold">Tournament Control Center</h1>
              <TournamentStatusBadge status={t.status} />
              {t.resultsLocked && (
                <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1">
                  <Lock className="h-3 w-3" /> FINAL LOCKED
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t.name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <StatusSwitcher id={t.id} current={t.status} onDone={refetch} />
            {t.resultsLocked ? (
              <Button variant="outline" disabled>
                <Lock className="h-4 w-4" /> Results Locked
              </Button>
            ) : (
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="border-primary/40 text-primary">
                    <LockOpen className="h-4 w-4" /> Lock Final Results
                  </Button>
                }
                title="Lock final results?"
                description="Locking makes all results read-only, finalizes the leaderboard, assigns prize winners and marks the tournament as completed. Further changes require Super Admin authorization."
                confirmLabel="Lock & Finalize"
                destructive={false}
                onConfirm={async () => {
                  await api(`/api/tournaments/${t.id}/lock`, { json: {} });
                  toast({ title: "Final results locked 🔒", description: "Leaderboard is now official and prizes are assigned." });
                  refetch();
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Stat strip (PRD 36) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Teams" value={stats.teams} hint={`${stats.verified} verified · ${stats.pending} pending`} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Matches" value={stats.matches} hint={`${stats.completed} completed`} icon={<Swords className="h-4 w-4" />} accent="muted" />
        <StatCard label="Current Match" value={stats.currentMatchNumber ? `#${String(stats.currentMatchNumber).padStart(2, "0")}` : "—"} icon={<Zap className="h-4 w-4" />} accent="warning" />
        <StatCard label="Complaints" value={stats.complaints} hint={`${stats.pendingComplaints} pending`} icon={<Gavel className="h-4 w-4" />} accent={stats.pendingComplaints ? "danger" : "muted"} />
        <StatCard label="Pending Payments" value={stats.pendingPayments} icon={<Coins className="h-4 w-4" />} accent={stats.pendingPayments ? "warning" : "muted"} />
        <StatCard label="Announcements" value={stats.announcements} icon={<Megaphone className="h-4 w-4" />} accent="muted" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar h-auto p-1.5 gap-1 bg-card border border-border rounded-xl">
          {[
            { v: "overview", l: "Quick Actions", icon: Zap },
            { v: "teams", l: "Teams & Registrations", icon: Users },
            { v: "matches", l: "Matches & Rooms", icon: Swords },
            { v: "results", l: "Result Entry", icon: Trophy },
            { v: "leaderboard", l: "Leaderboard", icon: Trophy },
            { v: "complaints", l: "Complaints", icon: Gavel },
            { v: "penalties", l: "Penalties", icon: Ban },
            { v: "announcements", l: "Announcements", icon: Megaphone },
            { v: "prizes", l: "Prizes", icon: Coins },
          ].map((item) => (
            <TabsTrigger
              key={item.v}
              value={item.v}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap gap-1.5"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.l}
              {item.v === "complaints" && stats.pendingComplaints > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-white px-1">{stats.pendingComplaints}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6 space-y-6">
          <TabsContent value="overview" className="mt-0">
            <QuickActions data={data} refetch={refetch} onGoTab={setTab} />
          </TabsContent>

          <TabsContent value="teams" className="mt-0">
            <TeamsTab data={data} refetch={refetch} />
          </TabsContent>

          <TabsContent value="matches" className="mt-0">
            <MatchesTab data={data} refetch={refetch} />
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <ResultsTab data={data} refetch={refetch} />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-0">
            <div className="space-y-4">
              <SectionHeader title="Live Leaderboard" subtitle="Updates automatically as results are published" />
              <LeaderboardTable rows={data.leaderboard} live={t.status === "ONGOING"} />
            </div>
          </TabsContent>

          <TabsContent value="complaints" className="mt-0">
            <ComplaintsTab data={data} refetch={refetch} />
          </TabsContent>

          <TabsContent value="penalties" className="mt-0">
            <PenaltiesTab data={data} refetch={refetch} />
          </TabsContent>

          <TabsContent value="announcements" className="mt-0">
            <AnnouncementsTab data={data} refetch={refetch} />
          </TabsContent>

          <TabsContent value="prizes" className="mt-0">
            <PrizesTab data={data} refetch={refetch} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function StatusSwitcher({ id, current, onDone }: { id: string; current: string; onDone: () => void }) {
  return (
    <Select
      value={current}
      onValueChange={async (status) => {
        try {
          await api(`/api/tournaments/${id}`, { method: "PATCH", json: { status } });
          toast({ title: "Status updated", description: `Tournament is now ${status.replace(/_/g, " ").toLowerCase()}.` });
          onDone();
        } catch (e) {
          toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
        }
      }}
    >
      <SelectTrigger className="w-44 text-xs h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {TOURNAMENT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {TOURNAMENT_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- Quick actions ----------

function QuickActions({
  data,
  refetch,
  onGoTab,
}: {
  data: ControlCenterData;
  refetch: () => void;
  onGoTab: (t: string) => void;
}) {
  const [matchOpen, setMatchOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);

  const actions = [
    {
      icon: Plus,
      title: "Create Match",
      desc: "Schedule the next match with room credentials",
      onClick: () => setMatchOpen(true),
    },
    {
      icon: DoorOpen,
      title: "Publish Room",
      desc: `${data.matches.filter((m) => m.roomPublished).length}/${data.matches.length} published`,
      onClick: () => onGoTab("matches"),
    },
    {
      icon: Trophy,
      title: "Enter Result",
      desc: "Placement + kills → auto-calculated points",
      onClick: () => onGoTab("results"),
    },
    {
      icon: Megaphone,
      title: "Send Announcement",
      desc: `Notify all ${data.stats.verified} verified teams`,
      onClick: () => setAnnounceOpen(true),
    },
    {
      icon: Gavel,
      title: "Review Complaints",
      desc: `${data.stats.pendingComplaints} pending cases`,
      onClick: () => onGoTab("complaints"),
    },
    {
      icon: Ban,
      title: "Apply Penalty",
      desc: "Warnings, deductions, DQ & bans",
      onClick: () => onGoTab("penalties"),
    },
    {
      icon: Users,
      title: "Verify Teams",
      desc: `${data.stats.pending} registrations pending`,
      onClick: () => onGoTab("teams"),
    },
    {
      icon: Swords,
      title: "View Leaderboard",
      desc: "Live standings",
      onClick: () => onGoTab("leaderboard"),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Quick Actions" subtitle="Run the tournament from here (PRD 36)" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((a) => (
          <button
            key={a.title}
            onClick={a.onClick}
            className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_rgba(255,122,28,0.35)] cursor-pointer"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 border border-primary/25 text-primary mb-3">
              <a.icon className="h-5 w-5" />
            </span>
            <p className="font-display font-bold text-sm">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
          </button>
        ))}
      </div>

      {/* Announcements from control center */}
      <AnnouncementDialog
        open={announceOpen}
        onOpenChange={setAnnounceOpen}
        tournamentId={data.tournament.id}
        onDone={refetch}
      />

      <CreateMatchDialog
        open={matchOpen}
        onOpenChange={setMatchOpen}
        tournamentId={data.tournament.id}
        nextNumber={(data.matches.at(-1)?.matchNumber ?? 0) + 1}
        onDone={refetch}
      />
    </div>
  );
}

// ---------- Teams tab ----------

function TeamsTab({ data, refetch }: { data: ControlCenterData; refetch: () => void }) {
  const [filter, setFilter] = useState("ALL");
  const [screenshotFor, setScreenshotFor] = useState<string | null>(null);

  const registrations = data.registrations.filter((r) => filter === "ALL" || (filter === "PAYMENT" ? r.payment?.status === "PENDING" : r.status === filter));

  async function act(id: string, status: string, note?: string) {
    try {
      await api(`/api/registrations/${id}`, { method: "PATCH", json: { status, note } });
      toast({ title: `Registration ${status.toLowerCase()}`, description: "The captain has been notified." });
      refetch();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  async function verifyPayment(paymentId: string) {
    try {
      await api(`/api/payments/${paymentId}`, { method: "PATCH", json: { status: "VERIFIED" } });
      toast({ title: "Payment verified ✅", description: "Registration moved to review queue." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  function rejectPaymentDialog(paymentId: string) {
    const reason = window.prompt("Rejection reason (required):");
    if (reason && reason.trim()) {
      api(`/api/payments/${paymentId}`, { method: "PATCH", json: { status: "REJECTED", rejectionReason: reason } })
        .then(() => {
          toast({ title: "Payment rejected", description: "The captain was notified with your reason." });
          refetch();
        })
        .catch((e) => toast({ title: "Failed", description: e.message, variant: "destructive" }));
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Teams & Registrations" subtitle={`${data.stats.verified} verified · ${data.stats.pending} pending`} />

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {["ALL", "PAYMENT", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-full whitespace-nowrap" onClick={() => setFilter(f)}>
            {f === "ALL" ? "All" : f === "PAYMENT" ? "Payment Pending" : f.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {registrations.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="No registrations" description="Teams will appear here once they register." />
      ) : (
        <div className="space-y-3">
          {registrations.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamLogo name={r.team.name} logoUrl={r.team.logoUrl} size={44} />
                    <div className="min-w-0">
                      <p className="font-display font-bold truncate">{r.team.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.regId} · {r.team.playerCount} players · {r.team.captainName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <RegistrationStatusBadge status={r.status} />
                    {r.payment && <PaymentStatusBadge status={r.payment.status} />}
                  </div>
                </div>

                {/* Players */}
                <div className="flex flex-wrap gap-1.5">
                  {r.team.players.map((p, i) => (
                    <span key={i} className={cn(
                      "rounded-md border px-2 py-0.5 text-xs",
                      p.isSubstitute ? "bg-violet-500/10 border-violet-500/30 text-violet-300" : "bg-secondary border-border"
                    )}>
                      {p.ign} <span className="text-muted-foreground font-mono">{p.uid}</span>
                    </span>
                  ))}
                </div>

                {/* Payment verification */}
                {r.payment && r.payment.status === "PENDING" && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                    <p className="text-sm flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-amber-400" />
                      {r.payment.method} · {r.payment.transactionId} · {formatMoney(r.payment.amount)}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {r.payment.screenshotUrl && (
                        <Button size="sm" variant="outline" onClick={() => setScreenshotFor(r.payment!.screenshotUrl!)}>
                          <ImageIcon className="h-3.5 w-3.5" /> View Screenshot
                        </Button>
                      )}
                      <Button size="sm" onClick={() => verifyPayment(r.payment!.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectPaymentDialog(r.payment!.id)}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap border-t border-border pt-3">
                  {r.status !== "APPROVED" && (
                    <Button
                      size="sm"
                      onClick={() => act(r.id, "APPROVED")}
                      disabled={!!r.payment && r.payment.status !== "VERIFIED"}
                      title={r.payment && r.payment.status !== "VERIFIED" ? "Verify payment first" : "Approve team"}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve Team
                    </Button>
                  )}
                  {r.status !== "REJECTED" && r.status !== "APPROVED" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const note = window.prompt("Rejection note (optional):") ?? "";
                        act(r.id, "REJECTED", note || undefined);
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  )}
                  {r.status === "APPROVED" && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Eligible for matches
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Screenshot viewer */}
      <Dialog open={!!screenshotFor} onOpenChange={(o) => !o && setScreenshotFor(null)}>
        <DialogContent className="bg-popover border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Payment Screenshot</DialogTitle>
          </DialogHeader>
          { }
          {screenshotFor && <img src={screenshotFor} alt="Payment screenshot" className="w-full rounded-lg border border-border" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Matches & Rooms tab ----------

function CreateMatchDialog({
  open,
  onOpenChange,
  tournamentId,
  nextNumber,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tournamentId: string;
  nextNumber: number;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ date: "", map: "Bermuda", mode: "Squad", roomId: "", roomPassword: "", roomReleaseAt: "" });

  async function submit() {
    setBusy(true);
    try {
      await api("/api/matches", {
        json: {
          tournamentId,
          matchNumber: nextNumber,
          date: form.date,
          map: form.map,
          mode: form.mode,
          roomId: form.roomId,
          roomPassword: form.roomPassword,
          roomReleaseAt: form.roomReleaseAt || null,
        },
      });
      toast({ title: `Match #${String(nextNumber).padStart(2, "0")} created`, description: "Publish room credentials when you're ready." });
      onOpenChange(false);
      setForm({ date: "", map: "Bermuda", mode: "Squad", roomId: "", roomPassword: "", roomReleaseAt: "" });
      onDone();
    } catch (e) {
      toast({ title: "Creation failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create Match #{String(nextNumber).padStart(2, "0")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Date & Start Time *</Label>
            <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Map</Label>
              <Select value={form.map} onValueChange={(v) => setForm({ ...form, map: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {MAPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {GAME_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Room ID *</Label>
              <Input placeholder="e.g. 4821937" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Room Password *</Label>
              <Input placeholder="e.g. battlora01" value={form.roomPassword} onChange={(e) => setForm({ ...form, roomPassword: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Room Release Time (optional)</Label>
            <Input type="datetime-local" value={form.roomReleaseAt} onChange={(e) => setForm({ ...form, roomReleaseAt: e.target.value })} />
            <p className="text-xs text-muted-foreground">Credentials stay hidden from teams until this time (PRD 15).</p>
          </div>
          <Button className="w-full" onClick={submit} disabled={busy || !form.date || !form.roomId || !form.roomPassword}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Match
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MatchesTab({ data, refetch }: { data: ControlCenterData; refetch: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);

  async function publishRoom(matchId: string, payload: { releaseNow?: boolean; roomReleaseAt?: string }) {
    try {
      await api(`/api/matches/${matchId}/room`, { method: "PATCH", json: payload });
      toast({ title: "Room published 🔑", description: payload.releaseNow ? "Credentials are now visible to all approved teams." : "Credentials will unlock at the configured time." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  async function setMatchStatus(matchId: string, status: string) {
    try {
      await api(`/api/matches/${matchId}`, { method: "PATCH", json: { status } });
      toast({ title: "Match status updated", description: `Now ${status.replace(/_/g, " ").toLowerCase()}.` });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Matches & Rooms"
        subtitle={`${data.stats.completed}/${data.stats.matches} completed`}
        action={
          <Button className="btn-primary-glow" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create Match
          </Button>
        }
      />

      {data.matches.length === 0 ? (
        <EmptyState icon={<Swords className="h-10 w-10" />} title="No matches yet" description="Create the first match to schedule the tournament." />
      ) : (
        <div className="space-y-3">
          {data.matches.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="grid place-items-center h-11 w-11 rounded-xl bg-primary/10 border border-primary/25 font-display text-lg font-bold text-primary shrink-0">
                      #{String(m.matchNumber).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m.map} · {m.mode}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(m.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <MatchStatusBadge status={m.status} />
                    {m.resultPublished && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Results published
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Room ID</p>
                    <p className="font-mono">{m.roomId ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Password</p>
                    <p className="font-mono">{m.roomPassword ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Release</p>
                    <p>{m.roomReleaseAt ? formatTime(m.roomReleaseAt) : "Immediate on publish"}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap border-t border-border pt-3">
                  {!m.roomPublished ? (
                    <>
                      <Button size="sm" onClick={() => publishRoom(m.id, { releaseNow: true })}>
                        <DoorOpen className="h-3.5 w-3.5" /> Publish & Release Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const when = window.prompt("Release at (YYYY-MM-DDTHH:mm):", new Date(Date.now() + 900_000).toISOString().slice(0, 16));
                          if (when) publishRoom(m.id, { roomReleaseAt: when });
                        }}
                      >
                        <CalendarDays className="h-3.5 w-3.5" /> Publish Timed
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <DoorOpen className="h-3.5 w-3.5" /> Room published {m.roomReleaseAt ? `· unlocks ${formatTime(m.roomReleaseAt)}` : "· visible now"}
                    </span>
                  )}
                  <Select value={m.status} onValueChange={(v) => setMatchStatus(m.id, v)}>
                    <SelectTrigger className="h-8 w-36 text-xs ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {["SCHEDULED", "ROOM_OPEN", "LIVE", "COMPLETED", "POSTPONED", "CANCELLED"].map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateMatchDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        tournamentId={data.tournament.id}
        nextNumber={(data.matches.at(-1)?.matchNumber ?? 0) + 1}
        onDone={refetch}
      />
    </div>
  );
}

// ---------- Result entry tab (PRD 17) ----------

function ResultsTab({ data, refetch }: { data: ControlCenterData; refetch: () => void }) {
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const selectedMatch = data.matches.find((m) => m.id === selectedMatchId) ?? data.matches.find((m) => !m.resultPublished) ?? data.matches[0];
  const config = data.tournament.scoringConfig;

  const [entries, setEntries] = useState<Record<string, { placement: string; kills: string }>>({});
  const [busy, setBusy] = useState(false);

  const teams = data.approvedTeams;
  const initialized = useMemo(() => {
    // load existing results when match changes
    return selectedMatch?.id ?? "";
  }, [selectedMatch?.id]);

  // fetch existing results for the selected match
  const { data: existing, refetch: refetchExisting } = useApiData<{
    results: { teamId: string; placement: number; kills: number; totalPoints: number; published: boolean }[];
    match: { id: string; resultPublished: boolean } | null;
  }>(selectedMatch ? `/api/matches/${selectedMatch.id}/results` : null);

  const merged = useMemo(() => {
    const map: Record<string, { placement: string; kills: string }> = {};
    for (const team of teams) map[team.id] = { placement: "", kills: "" };
    for (const r of existing?.results ?? []) {
      map[r.teamId] = { placement: String(r.placement), kills: String(r.kills) };
    }
    return map;
  }, [teams, existing]);

  const rows = teams.map((team) => {
    const e = entries[team.id] ?? merged[team.id] ?? { placement: "", kills: "" };
    const placement = parseInt(e.placement || "0", 10) || 0;
    const kills = parseInt(e.kills || "0", 10) || 0;
    const placementPoints = config.placementPoints[String(placement)] ?? (placement > 0 ? config.placementPoints["default"] ?? 0 : 0);
    const killPoints = kills * config.killPoint;
    return { team, placement, kills, placementPoints, killPoints, total: placementPoints + killPoints };
  });

  const filled = rows.filter((r) => r.placement > 0);

  if (data.approvedTeams.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="No approved teams"
        description="Approve team registrations first — only approved teams can receive results (PRD 52)."
      />
    );
  }

  async function save(action: "save" | "publish") {
    if (!selectedMatch) return;
    setBusy(true);
    try {
      await api(`/api/matches/${selectedMatch.id}/results`, {
        json: {
          action,
          results: rows.filter((r) => r.placement > 0).map((r) => ({ teamId: r.team.id, placement: r.placement, kills: r.kills })),
        },
      });
      toast({
        title: action === "publish" ? "Results published 🏆" : "Draft saved",
        description:
          action === "publish"
            ? "Leaderboard updated automatically and all teams were notified."
            : "Results saved as draft — publish when final.",
      });
      refetch();
      refetchExisting();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Result Entry"
        subtitle="Enter placement and kills — points are calculated automatically"
      />

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedMatch?.id ?? ""} onValueChange={(v) => { setSelectedMatchId(v); setEntries({}); }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select match" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {data.matches.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                Match #{String(m.matchNumber).padStart(2, "0")} · {m.map}
                {m.resultPublished ? " ✓" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedMatch?.resultPublished && (
          <span className="text-xs text-amber-400 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Published — editing creates a correction record (PRD 53)
          </span>
        )}
      </div>

      {!selectedMatch ? (
        <EmptyState icon={<Swords className="h-10 w-10" />} title="No matches" description="Create a match first." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                    <th className="py-3 px-4 text-left">Team</th>
                    <th className="py-3 px-3 text-center w-28">Placement</th>
                    <th className="py-3 px-3 text-center w-24">Kills</th>
                    <th className="py-3 px-3 text-center w-24 hidden sm:table-cell">Placement Pts</th>
                    <th className="py-3 px-3 text-center w-20 hidden sm:table-cell">Kill Pts</th>
                    <th className="py-3 px-4 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.team.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TeamLogo name={r.team.name} logoUrl={r.team.logoUrl} size={28} />
                          <span className="font-medium truncate">{r.team.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min={1}
                          placeholder="—"
                          className="text-center h-9"
                          value={entries[r.team.id]?.placement ?? merged[r.team.id]?.placement ?? ""}
                          onChange={(e) => setEntries((prev) => ({ ...prev, [r.team.id]: { ...(prev[r.team.id] ?? merged[r.team.id]), placement: e.target.value } }))}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          className="text-center h-9"
                          value={entries[r.team.id]?.kills ?? merged[r.team.id]?.kills ?? ""}
                          onChange={(e) => setEntries((prev) => ({ ...prev, [r.team.id]: { ...(prev[r.team.id] ?? merged[r.team.id]), kills: e.target.value } }))}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center text-muted-foreground hidden sm:table-cell">{r.placementPoints}</td>
                      <td className="py-2.5 px-3 text-center text-muted-foreground hidden sm:table-cell">{r.killPoints}</td>
                      <td className="py-2.5 px-4 text-right font-display font-bold text-primary">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {filled.length}/{teams.length} teams entered · {filled.length * 1} rows · scoring: 1st={config.placementPoints["1"]}pts, kill={config.killPoint}pt
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save("save")} disabled={busy || filled.length === 0}>
                Save Draft
              </Button>
              {selectedMatch.resultPublished ? (
                <ConfirmDialog
                  trigger={
                    <Button disabled={busy || filled.length !== teams.length} className="btn-primary-glow">
                      <Trophy className="h-4 w-4" /> Correct & Republish
                    </Button>
                  }
                  title="Correct published results?"
                  description="A correction record will be created with the previous values, and the leaderboard will be recalculated. This is fully auditable (PRD 53)."
                  confirmLabel="Republish"
                  onConfirm={() => save("publish")}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button disabled={busy || filled.length !== teams.length} className="btn-primary-glow">
                      <Trophy className="h-4 w-4" /> Publish Results
                    </Button>
                  }
                  title="Publish results?"
                  description="The leaderboard will update automatically and all teams will be notified. Results can still be corrected with an audit trail."
                  confirmLabel="Publish"
                  destructive={false}
                  onConfirm={() => save("publish")}
                />
              )}
            </div>
          </div>
        </>
      )}
      {/* initialized marker to satisfy lint */}
      <span className="hidden">{initialized}</span>
    </div>
  );
}

// ---------- Complaints tab ----------

function ComplaintsTab({ data, refetch }: { data: ControlCenterData; refetch: () => void }) {
  const [viewer, setViewer] = useState<string | null>(null);

  async function update(id: string, status: string) {
    try {
      await api(`/api/complaints/${id}`, { method: "PATCH", json: { status } });
      toast({ title: `Case ${status.replace(/_/g, " ").toLowerCase()}`, description: "The team has been notified." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  async function saveNotes(id: string, notes: string) {
    try {
      await api(`/api/complaints/${id}`, { method: "PATCH", json: { internalNotes: notes } });
      toast({ title: "Internal notes saved" });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  if (data.complaints.length === 0) {
    return <EmptyState icon={<Gavel className="h-10 w-10" />} title="No complaints" description="Protests submitted by teams will appear here." />;
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Complaints & Evidence" subtitle="Review evidence, update case status (PRD 24)" />
      {data.complaints.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm text-primary">{c.ticketId}</span>
                <ComplaintTypeBadge type={c.type} />
              </div>
              <ComplaintStatusBadge status={c.status} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
            <p className="text-xs text-muted-foreground">
              {c.team.name} · {timeAgo(c.createdAt)}
            </p>
            {c.evidence.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {c.evidence.map((e) => (
                   
                  <img
                    key={e.id}
                    src={e.url}
                    alt={e.name ?? "evidence"}
                    className="h-20 rounded-lg border border-border object-cover cursor-pointer hover:border-primary/40"
                    onClick={() => setViewer(e.url)}
                  />
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap border-t border-border pt-3">
              {c.status === "PENDING" && (
                <Button size="sm" variant="outline" onClick={() => update(c.id, "UNDER_REVIEW")}>Start Review</Button>
              )}
              {["PENDING", "UNDER_REVIEW"].includes(c.status) && (
                <>
                  <Button size="sm" onClick={() => update(c.id, "CONFIRMED")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Violation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => update(c.id, "REJECTED")}>Reject</Button>
                </>
              )}
              {c.status === "CONFIRMED" && (
                <Button size="sm" onClick={() => update(c.id, "RESOLVED")}>Mark Resolved</Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => {
                  const notes = window.prompt("Internal notes (admins only):", c.internalNotes ?? "");
                  if (notes !== null) saveNotes(c.id, notes);
                }}
              >
                Internal Notes {c.internalNotes ? "•" : ""}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="bg-popover border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Evidence</DialogTitle>
          </DialogHeader>
          { }
          {viewer && <img src={viewer} alt="Evidence" className="w-full rounded-lg border border-border" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Penalties tab (PRD 25–26) ----------

function PenaltiesTab({ data, refetch }: { data: ControlCenterData; refetch: () => void }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ teamId: "", type: "WARNING", value: "0", reason: "" });
  const needsValue = form.type === "POINT_DEDUCTION" || form.type === "KILL_DEDUCTION" || form.type === "PRIZE_DEDUCTION";

  async function submit() {
    setBusy(true);
    try {
      await api("/api/penalties", {
        json: {
          tournamentId: data.tournament.id,
          teamId: form.teamId,
          type: form.type,
          value: Number(form.value),
          reason: form.reason,
        },
      });
      toast({ title: "Penalty issued", description: "The team captain has been notified." });
      setForm({ teamId: "", type: "WARNING", value: "0", reason: "" });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      await api("/api/penalties", { method: "PATCH", json: { id, active: false } });
      toast({ title: "Penalty revoked", description: "Leaderboard recalculated." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Penalties" subtitle="Warnings, deductions, disqualifications & bans" />

      <Card className="border-rose-500/25">
        <CardContent className="p-5 space-y-4">
          <h3 className="font-display font-bold flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive" /> Apply Penalty
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Team *</Label>
              <Select value={form.teamId || undefined} onValueChange={(v) => setForm({ ...form, teamId: v })}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-64">
                  {data.registrations.map((r) => (
                    <SelectItem key={r.team.id} value={r.team.id}>{r.team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Penalty Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {PENALTY_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {needsValue && (
              <div className="space-y-1.5">
                <Label>Value (points/kills/৳) *</Label>
                <Input type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            )}
            <div className={cn("space-y-1.5", !needsValue && "sm:col-span-2")}>
              <Label>Reason * (min 10 chars)</Label>
              <Textarea rows={2} placeholder="e.g. Teaming with Team Bravo in Match #04 — video evidence attached (CMP-2026-00031)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <Button variant="destructive" onClick={submit} disabled={busy || !form.teamId || form.reason.trim().length < 10 || (needsValue && Number(form.value) <= 0)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Issue Penalty
          </Button>
          <p className="text-xs text-rose-300/80">
            Zero-tolerance violations (hacking, match fixing, teaming, identity fraud, ghosting…) → use Disqualification or Tournament Ban for immediate action (PRD 26).
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-display font-bold">Penalty History</h3>
        {data.penalties.length === 0 ? (
          <EmptyState icon={<Gavel className="h-8 w-8" />} title="No penalties issued" description="A clean tournament so far." />
        ) : (
          data.penalties.map((p) => (
            <Card key={p.id} className={cn(!p.active && "opacity-50")}>
              <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PenaltyTypeBadge type={p.type} />
                    {p.value > 0 && <span className="text-sm font-bold text-amber-400">−{p.value}</span>}
                    {p.team && <span className="text-sm font-medium">{p.team.name}</span>}
                    {!p.active && <span className="text-xs text-muted-foreground">(revoked)</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    by {p.issuer.name} · {timeAgo(p.createdAt)}
                  </p>
                </div>
                {p.active && (
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => revoke(p.id)}>
                    Revoke
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Announcements tab ----------

function AnnouncementDialog({
  open,
  onOpenChange,
  tournamentId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tournamentId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "NORMAL" });

  async function submit() {
    setBusy(true);
    try {
      await api("/api/announcements", {
        json: { ...form, tournamentId },
      });
      toast({ title: "Announcement published 📢", description: "All registered teams were notified." });
      onOpenChange(false);
      setForm({ title: "", description: "", priority: "NORMAL" });
      onDone();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Send Announcement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="e.g. Match #05 moved to 9:30 PM" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea rows={4} placeholder="Details for the teams…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="IMPORTANT">Important</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={submit} disabled={busy || form.title.length < 3 || form.description.length < 10}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Publish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementsTab({ data, refetch }: { data: ControlCenterData; refetch: () => void }) {
  const [open, setOpen] = useState(false);

  async function remove(id: string) {
    try {
      await api(`/api/announcements/${id}`, { method: "DELETE" });
      toast({ title: "Announcement deleted" });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Announcements"
        subtitle="Broadcast updates to registered teams"
        action={
          <Button className="btn-primary-glow" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        }
      />
      {data.announcements.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-10 w-10" />} title="No announcements" description="Teams will see announcements on the tournament page and their dashboard." />
      ) : (
        <div className="space-y-3">
          {data.announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{timeAgo(a.publishAt)} · {a.priority}</p>
                </div>
                <ConfirmDialog
                  trigger={<Button size="sm" variant="ghost" className="text-muted-foreground"><X className="h-4 w-4" /></Button>}
                  title="Delete announcement?"
                  description="This announcement will be removed from the tournament page and dashboards."
                  confirmLabel="Delete"
                  onConfirm={() => remove(a.id)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <AnnouncementDialog open={open} onOpenChange={setOpen} tournamentId={data.tournament.id} onDone={refetch} />
    </div>
  );
}

// ---------- Prizes tab ----------

function PrizesTab({ data, refetch }: { data: ControlCenterData; refetch: () => void }) {
  const [busy, setBusy] = useState(false);
  const prizes = data.prizes.length > 0 ? data.prizes : data.tournament.prizeConfig.map((p, i) => ({ id: `cfg-${i}`, name: p.name, amount: p.amount, status: "PENDING", winnerTeamId: null as string | null }));

  async function updateStatus(id: string, status: string) {
    if (id.startsWith("cfg-")) {
      toast({ title: "Save the prize configuration first", description: "Prize records are created from the configuration." });
      return;
    }
    try {
      await api(`/api/tournaments/${data.tournament.id}/prizes`, {
        method: "PUT",
        json: { prizes: data.prizes.map((p) => ({ name: p.name, amount: p.amount, status: p.id === id ? status : p.status })) },
      });
      toast({ title: `Prize marked ${status.toLowerCase()}` });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  const teamName = (id: string | null) =>
    id ? data.approvedTeams.find((t) => t.id === id)?.name ?? data.leaderboard.find((l) => l.teamId === id)?.teamName : null;

  return (
    <div className="space-y-4">
      <SectionHeader title="Prize Management" subtitle={`Total pool: ${formatMoney(data.tournament.prizePool)} (PRD 29–30)`} />
      <div className="grid gap-3 sm:grid-cols-2">
        {prizes.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">{p.name}</h3>
                <PrizeStatusBadge status={p.status} />
              </div>
              <p className="font-display text-2xl font-bold text-primary">{formatMoney(p.amount)}</p>
              {teamName(p.winnerTeamId) && (
                <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> {teamName(p.winnerTeamId)}
                </p>
              )}
              <div className="flex gap-2 border-t border-border pt-3">
                {p.status !== "APPROVED" && p.status !== "PAID" && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => updateStatus(p.id, "APPROVED")}>Approve</Button>
                )}
                {p.status === "APPROVED" && (
                  <Button size="sm" disabled={busy} onClick={() => updateStatus(p.id, "PAID")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Winners are assigned automatically when final results are locked. Prize payment records stay here for tracking (PENDING → APPROVED → PAID).
      </p>
    </div>
  );
}
