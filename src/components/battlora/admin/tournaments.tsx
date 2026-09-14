"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Coins, Loader2, Plus, Search, Swords, Trophy, Users } from "lucide-react";
import { useRouter } from "../router";
import { useApiData } from "../data-hooks";
import {
  EmptyState,
  LoadingRows,
  SectionHeader,
  TournamentStatusBadge,
} from "../shared/kit";
import { ConfirmDialog } from "../shared/copy-field";
import { api } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/format";
import { GAME_MODES, MAPS, TOURNAMENT_STATUSES, TOURNAMENT_STATUS_LABELS, DEFAULT_SCORING, TIE_BREAK_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

type TournamentRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  game: string;
  mode: string;
  entryFee: number;
  prizePool: number;
  teamLimit: number;
  registeredTeams: number;
  matchCount: number;
  registrationEnd: string | null;
  tournamentStart: string | null;
  featured: boolean;
  resultsLocked: boolean;
};

export function AdminTournaments() {
  const { navigate } = useRouter();
  const { data, loading, refetch } = useApiData<{ tournaments: TournamentRow[] }>("/api/tournaments");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const tournaments = (data?.tournaments ?? []).filter(
    (t) => !q || t.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tournaments"
        subtitle="Create and manage competitions (PRD 37–39)"
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary-glow">
                <Plus className="h-4 w-4" /> Create Tournament
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Create Tournament</DialogTitle>
              </DialogHeader>
              <CreateTournamentForm
                onCreated={(id) => {
                  setCreateOpen(false);
                  refetch();
                  navigate(`/admin/tournaments/${id}`);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tournaments…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <LoadingRows count={4} />
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-10 w-10" />}
          title="No tournaments yet"
          description="Create your first tournament to open registrations."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((t) => (
            <Card key={t.id} className="card-hover">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold truncate">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t.game} · {t.mode}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <TournamentStatusBadge status={t.status} />
                    {t.resultsLocked && (
                      <span className="text-[10px] text-primary font-bold uppercase">Locked</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Prize pool</p>
                    <p className="font-semibold">{formatMoney(t.prizePool)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entry fee</p>
                    <p className="font-semibold">{t.entryFee > 0 ? formatMoney(t.entryFee) : "Free"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Teams</p>
                    <p className="font-semibold">
                      {t.registeredTeams}/{t.teamLimit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Matches</p>
                    <p className="font-semibold">{t.matchCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t.tournamentStart ? `Starts ${formatDate(t.tournamentStart)}` : "Start date TBD"}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => navigate(`/admin/tournaments/${t.id}`)}>
                    Control Center
                  </Button>
                  <StatusChanger t={t} onDone={refetch} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusChanger({ t, onDone }: { t: TournamentRow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Select
      value={t.status}
      onValueChange={async (status) => {
        setBusy(true);
        try {
          await api(`/api/tournaments/${t.id}`, { method: "PATCH", json: { status } });
          toast({ title: "Status updated", description: `${t.name} → ${TOURNAMENT_STATUS_LABELS[status as keyof typeof TOURNAMENT_STATUS_LABELS]}` });
          onDone();
        } catch (e) {
          toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
        } finally {
          setBusy(false);
        }
      }}
    >
      <SelectTrigger className="h-9 w-32 text-xs" disabled={busy}>
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

// ---------- Create tournament form (PRD 37) ----------

function CreateTournamentForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    game: "Free Fire",
    mode: "Squad",
    format: "Battle Royale — Points System",
    status: "REGISTRATION_OPEN",
    entryFee: 100,
    teamLimit: 48,
    playersPerTeam: 4,
    matchCount: 6,
    substituteAllowed: true,
    featured: true,
    registrationStart: "",
    registrationEnd: "",
    tournamentStart: "",
    tournamentEnd: "",
    prizePool: 10000,
    killPoint: 1,
    pp1: 12, pp2: 9, pp3: 8, pp4: 7, pp5: 6, pp6: 5, pp7: 4, pp8: 3, pp9: 2, pp10: 1,
    prize1: 0, prize2: 0, prize3: 0,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ tournament: { id: string } }>("/api/tournaments", {
        json: {
          name: form.name,
          description: form.description,
          game: form.game,
          mode: form.mode,
          format: form.format,
          status: form.status,
          entryFee: Number(form.entryFee),
          teamLimit: Number(form.teamLimit),
          playersPerTeam: Number(form.playersPerTeam),
          matchCount: Number(form.matchCount),
          substituteAllowed: form.substituteAllowed,
          featured: form.featured,
          registrationStart: form.registrationStart || null,
          registrationEnd: form.registrationEnd || null,
          tournamentStart: form.tournamentStart || null,
          tournamentEnd: form.tournamentEnd || null,
          prizePool: Number(form.prizePool),
          killPoint: Number(form.killPoint),
          placementPoints: {
            "1": Number(form.pp1), "2": Number(form.pp2), "3": Number(form.pp3),
            "4": Number(form.pp4), "5": Number(form.pp5), "6": Number(form.pp6),
            "7": Number(form.pp7), "8": Number(form.pp8), "9": Number(form.pp9),
            "10": Number(form.pp10), default: 0,
          },
          prizeConfig: [
            { name: "1st Prize", amount: Number(form.prize1), description: "" },
            { name: "2nd Prize", amount: Number(form.prize2), description: "" },
            { name: "3rd Prize", amount: Number(form.prize3), description: "" },
          ],
          rulesJson: JSON.stringify(defaultRules()),
        },
      });
      toast({ title: "Tournament created 🏆", description: `${form.name} is ready. Configure rules & matches in the Control Center.` });
      onCreated(res.tournament.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <FormSection title="Basic">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Tournament Name *</Label>
            <Input placeholder="e.g. Battlora Pro Series S2" value={form.name} onChange={set("name")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} placeholder="Tournament description shown to players…" value={form.description} onChange={set("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Game</Label>
            <Input value={form.game} onChange={set("game")} />
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
      </FormSection>

      <FormSection title="Registration">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Entry Fee (৳)</Label>
            <Input type="number" min={0} value={form.entryFee} onChange={set("entryFee")} />
          </div>
          <div className="space-y-1.5">
            <Label>Team Limit</Label>
            <Input type="number" min={2} max={64} value={form.teamLimit} onChange={set("teamLimit")} />
          </div>
          <div className="space-y-1.5">
            <Label>Players per Team</Label>
            <Input type="number" min={1} max={6} value={form.playersPerTeam} onChange={set("playersPerTeam")} />
          </div>
          <div className="space-y-1.5">
            <Label>Match Count</Label>
            <Input type="number" min={1} value={form.matchCount} onChange={set("matchCount")} />
          </div>
          <div className="space-y-1.5">
            <Label>Registration Start</Label>
            <Input type="datetime-local" value={form.registrationStart} onChange={set("registrationStart")} />
          </div>
          <div className="space-y-1.5">
            <Label>Registration End</Label>
            <Input type="datetime-local" value={form.registrationEnd} onChange={set("registrationEnd")} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 sm:col-span-2">
            <Label className="text-sm">Substitute allowed</Label>
            <Switch checked={form.substituteAllowed} onCheckedChange={(v) => setForm({ ...form, substituteAllowed: v })} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Tournament Schedule">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tournament Start</Label>
            <Input type="datetime-local" value={form.tournamentStart} onChange={set("tournamentStart")} />
          </div>
          <div className="space-y-1.5">
            <Label>Tournament End</Label>
            <Input type="datetime-local" value={form.tournamentEnd} onChange={set("tournamentEnd")} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 sm:col-span-2">
            <Label className="text-sm">Feature on homepage</Label>
            <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Initial Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {TOURNAMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{TOURNAMENT_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      <FormSection title="Scoring (Placement Points + Kill Points)">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {(["pp1","pp2","pp3","pp4","pp5","pp6","pp7","pp8","pp9","pp10"] as const).map((k, i) => (
            <div key={k} className="space-y-1">
              <Label className="text-[10px] text-center block">{i + 1}{["st","nd","rd"][i] ?? "th"}</Label>
              <Input
                type="number"
                min={0}
                className="text-center px-1"
                value={form[k]}
                onChange={set(k)}
              />
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <div className="space-y-1.5">
            <Label>Points per Kill</Label>
            <Input type="number" min={0} value={form.killPoint} onChange={set("killPoint")} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Prize Pool">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Total Prize Pool (৳)</Label>
            <Input type="number" min={0} value={form.prizePool} onChange={set("prizePool")} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">1st (৳)</Label>
              <Input type="number" min={0} value={form.prize1} onChange={set("prize1")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">2nd (৳)</Label>
              <Input type="number" min={0} value={form.prize2} onChange={set("prize2")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">3rd (৳)</Label>
              <Input type="number" min={0} value={form.prize3} onChange={set("prize3")} />
            </div>
          </div>
        </div>
      </FormSection>

      {error && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2">{error}</p>}

      <Button className="w-full btn-primary-glow" onClick={submit} disabled={busy || form.name.trim().length < 3}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
        Create Tournament
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        A standard rulebook and prize config are pre-filled — customize them in the Control Center.
      </p>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</h3>
      {children}
    </div>
  );
}

function defaultRules() {
  const cats: { category: string; items: { type: "paragraph" | "bullets" | "notice" | "warning"; text: string }[] }[] = [
    {
      category: "General Rules",
      items: [
        { type: "paragraph", text: "All participants must respect fair play. The tournament admin's decision is final in all situations." },
        { type: "bullets", text: "Teams must join the room 10 minutes before the scheduled start time.\nRoom credentials must never be shared outside the team.\nEmulators and PC players are strictly prohibited." },
      ],
    },
    {
      category: "Registration",
      items: [
        { type: "bullets", text: "All players must be registered with their real Free Fire UID.\nOne player may only play for one team per tournament.\nTeams must have the required number of main players." },
        { type: "notice", text: "Registration is only complete after payment verification (if the tournament has an entry fee)." },
      ],
    },
    {
      category: "Gameplay & Match Rules",
      items: [
        { type: "bullets", text: "Teaming with other squads is banned and leads to immediate disqualification.\nPanic-gloves and gun skins are allowed unless stated otherwise.\nIf a match crashes, admins will decide on a rematch." },
      ],
    },
    {
      category: "Scoring",
      items: [
        { type: "paragraph", text: "Points = Placement Points + Kill Points (1 point per kill). The official leaderboard updates automatically when results are published." },
      ],
    },
    {
      category: "Protest & Penalties",
      items: [
        { type: "warning", text: "Hacking, cheating, teaming, account sharing, ghosting or stream sniping lead to immediate disqualification and a possible tournament ban. Evidence must be submitted within 30 minutes of the match." },
      ],
    },
  ];
  return cats;
}
