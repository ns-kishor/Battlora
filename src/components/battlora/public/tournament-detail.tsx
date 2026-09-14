"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Ban,
  Bell,
  CalendarDays,
  CheckCircle2,
  Coins,
  Crown,
  Gamepad2,
  Info,
  ListChecks,
  Lock,
  Map,
  Megaphone,
  Medal,
  Rocket,
  Skull,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "../router";
import { useAuth } from "../auth-context";
import { useApiData } from "../data-hooks";
import {
  BackButton,
  EmptyState,
  LoadingRows,
  MatchStatusBadge,
  PriorityBadge,
  SectionHeader,
  TeamLogo,
  TournamentStatusBadge,
} from "../shared/kit";
import { LeaderboardTable, type LeaderboardRowData } from "../shared/leaderboard";
import { formatDate, formatDateTime, formatMoney, formatTime, ordinal, timeAgo } from "@/lib/format";
import type { RuleSection, RuleItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type TournamentDetailData = {
  tournament: {
    id: string;
    slug: string;
    name: string;
    description: string;
    bannerUrl: string | null;
    game: string;
    mode: string;
    format: string;
    status: string;
    entryFee: number;
    teamLimit: number;
    playersPerTeam: number;
    registrationStart: string | null;
    registrationEnd: string | null;
    tournamentStart: string | null;
    tournamentEnd: string | null;
    substituteAllowed: boolean;
    prizePool: number;
    resultsLocked: boolean;
    registeredTeams: number;
    rules: RuleSection[];
    prizeConfig: { name: string; amount: number; description?: string }[];
    scoringConfig: { placementPoints: Record<string, number>; killPoint: number };
  };
  matches: {
    id: string;
    matchNumber: number;
    date: string;
    map: string;
    mode: string;
    status: string;
    resultPublished: boolean;
    roomPublished: boolean;
    roomId: string | null;
    roomPassword: string | null;
    roomAvailableAt: string | null;
  }[];
  teams: {
    id: string;
    name: string;
    logoUrl: string | null;
    status: string;
    captainName: string;
    players: { ign: string; uid: string; role: string; status: string }[];
    substitute: { ign: string; uid: string }[];
  }[];
  leaderboard: LeaderboardRowData[];
  announcements: { id: string; title: string; description: string; priority: string; publishAt: string }[];
  prizes: { id: string; name: string; amount: number; description: string | null; winnerTeamId: string | null; status: string }[];
  myRegistration: { id: string; regId: string; status: string; paymentStatus: string | null } | null;
  paymentMethods: { name: string; number: string; type: string }[];
  faq: { q: string; a: string }[];
};

export function TournamentDetail({ idOrSlug }: { idOrSlug: string }) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { data, loading, error } = useApiData<TournamentDetailData>(
    `/api/tournaments/${idOrSlug}`,
    { refreshMs: 30_000 }
  );
  const [tab, setTab] = useState("overview");

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
        <div className="h-56 rounded-2xl bg-card animate-pulse" />
        <LoadingRows count={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          icon={<Trophy className="h-10 w-10" />}
          title="Tournament not found"
          description={error ?? "This tournament does not exist or is not public yet."}
          action={
            <Button onClick={() => navigate("/tournaments")}>Browse tournaments</Button>
          }
        />
      </div>
    );
  }

  const { tournament: t } = data;
  const registrationOpen = t.status === "REGISTRATION_OPEN";
  const isCompleted = t.status === "COMPLETED";
  const champion = data.leaderboard.find((r) => r.rank === 1);
  const runnerUp = data.leaderboard.find((r) => r.rank === 2);
  const third = data.leaderboard.find((r) => r.rank === 3);
  const topKiller = [...data.leaderboard].sort((a, b) => b.kills - a.kills)[0];

  const facts = [
    { icon: Coins, label: "Prize Pool", value: formatMoney(t.prizePool) },
    { icon: Zap, label: "Entry Fee", value: t.entryFee > 0 ? formatMoney(t.entryFee) : "Free" },
    { icon: Users, label: "Teams", value: `${t.registeredTeams}/${t.teamLimit}` },
    { icon: CalendarDays, label: "Tournament Date", value: formatDate(t.tournamentStart) },
    { icon: Lock, label: "Registration Deadline", value: formatDate(t.registrationEnd) },
    { icon: Gamepad2, label: "Game / Mode", value: `${t.game} · ${t.mode}` },
  ];

  return (
    <div className="pb-10">
      {/* ---------- Banner header ---------- */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-primary/25 via-card to-background border-b border-border">
        {t.bannerUrl && (
           
          <img src={t.bannerUrl} alt={`${t.name} banner`} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-20 sm:-mt-24 relative z-10">
          <BackButton onClick={() => navigate("/tournaments")} label="All tournaments" />

          <div className="flex flex-col lg:flex-row lg:items-end gap-5 mt-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <TournamentStatusBadge status={t.status} />
                {t.resultsLocked && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1.5">
                    <Lock className="h-3 w-3" /> Official Final Results
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 text-balance">
                {t.name}
              </h1>
              <p className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <Gamepad2 className="h-3.5 w-3.5" /> {t.game}
                </span>
                <span className="flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5" /> {t.mode}
                </span>
                <span className="flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" /> {t.format}
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {registrationOpen &&
                (data.myRegistration ? (
                  <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Registration:{" "}
                    {data.myRegistration.status.replace(/_/g, " ")}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="btn-primary-glow"
                    onClick={() => navigate(`/join/${t.slug}`)}
                  >
                    <Rocket className="h-4 w-4" /> {user ? "Register Now" : "Login & Register"}
                  </Button>
                ))}
              {!registrationOpen && !isCompleted && (
                <Button size="lg" variant="outline" onClick={() => setTab("leaderboard")}>
                  <Trophy className="h-4 w-4" /> View Leaderboard
                </Button>
              )}
              {isCompleted && (
                <Button size="lg" variant="outline" onClick={() => setTab("leaderboard")}>
                  <Crown className="h-4 w-4 text-amber-400" /> Final Standings
                </Button>
              )}
            </div>
          </div>

          {/* Key facts strip */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {facts.map((f) => (
              <Card key={f.label} className="glass">
                <CardContent className="p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <f.icon className="h-3 w-3" /> {f.label}
                  </p>
                  <p className="font-display font-bold text-sm sm:text-base mt-1 truncate">{f.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ---------- Tabs ---------- */}
        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="w-full justify-start overflow-x-auto no-scrollbar h-auto p-1.5 gap-1 bg-card border border-border rounded-xl">
            {[
              { value: "overview", label: "Overview", icon: Info },
              { value: "rules", label: "Rules", icon: ListChecks },
              { value: "schedule", label: "Schedule", icon: CalendarDays },
              { value: "matches", label: "Matches", icon: Swords },
              { value: "teams", label: "Teams", icon: Users },
              { value: "leaderboard", label: "Leaderboard", icon: Trophy },
              { value: "announcements", label: "Announcements", icon: Megaphone },
              { value: "prizes", label: "Prize Pool", icon: Coins },
              { value: "faq", label: "FAQ", icon: Bell },
            ].map((tabItem) => (
              <TabsTrigger
                key={tabItem.value}
                value={tabItem.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap gap-1.5"
              >
                <tabItem.icon className="h-3.5 w-3.5" />
                {tabItem.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {/* ===== OVERVIEW ===== */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {isCompleted && champion && <WinnersPanel data={data} />}
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <SectionHeader title="About this tournament" />
                  <p className="text-sm sm:text-base text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">
                    {t.description || "No description provided yet."}
                  </p>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-display font-bold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Team Requirements
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li className="flex justify-between">
                        <span>Main players</span>
                        <span className="text-foreground font-medium">{t.playersPerTeam} required</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Substitute</span>
                        <span className="text-foreground font-medium">
                          {t.substituteAllowed ? "Allowed (1)" : "Not allowed"}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Team limit</span>
                        <span className="text-foreground font-medium">{t.teamLimit} teams</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Registered</span>
                        <span className="text-foreground font-medium">{t.registeredTeams} teams</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-display font-bold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" /> Scoring System
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      Placement Points + ({t.scoringConfig.killPoint} pt per kill) = Total Match Points
                    </p>
                    <div className="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {Object.entries(t.scoringConfig.placementPoints)
                        .filter(([k]) => k !== "default")
                        .map(([place, pts]) => (
                          <div
                            key={place}
                            className={cn(
                              "rounded-lg border text-center py-1.5",
                              place === "1"
                                ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                                : "border-border bg-background"
                            )}
                          >
                            <p className="text-[10px] text-muted-foreground">{ordinal(Number(place))}</p>
                            <p className="font-display font-bold text-sm">{pts}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ===== RULES ===== */}
            <TabsContent value="rules" className="mt-0">
              <RulesView rules={t.rules} />
            </TabsContent>

            {/* ===== SCHEDULE ===== */}
            <TabsContent value="schedule" className="mt-0">
              <MatchSchedule matches={data.matches} />
            </TabsContent>

            {/* ===== MATCHES ===== */}
            <TabsContent value="matches" className="mt-0">
              <MatchListPublic matches={data.matches} live />
            </TabsContent>

            {/* ===== TEAMS ===== */}
            <TabsContent value="teams" className="mt-0">
              <TeamsGrid teams={data.teams} />
            </TabsContent>

            {/* ===== LEADERBOARD ===== */}
            <TabsContent value="leaderboard" className="mt-0">
              <div className="space-y-6">
                {isCompleted && champion && <WinnersPanel data={data} compact />}
                <LeaderboardTable rows={data.leaderboard} live={t.status === "ONGOING"} />
              </div>
            </TabsContent>

            {/* ===== ANNOUNCEMENTS ===== */}
            <TabsContent value="announcements" className="mt-0">
              <AnnouncementsList announcements={data.announcements} />
            </TabsContent>

            {/* ===== PRIZES ===== */}
            <TabsContent value="prizes" className="mt-0">
              <PrizePoolView data={data} />
            </TabsContent>

            {/* ===== FAQ ===== */}
            <TabsContent value="faq" className="mt-0">
              <FaqView faq={data.faq} paymentMethods={data.paymentMethods} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// ============ Sub-views ============

function WinnersPanel({ data, compact }: { data: TournamentDetailData; compact?: boolean }) {
  const champion = data.leaderboard.find((r) => r.rank === 1);
  const runnerUp = data.leaderboard.find((r) => r.rank === 2);
  const third = data.leaderboard.find((r) => r.rank === 3);
  const topKiller = [...data.leaderboard].sort((a, b) => b.kills - a.kills)[0];
  if (!champion) return null;

  const championPrize = data.prizes.find(
    (p) => /1st|champion/i.test(p.name) && p.winnerTeamId === champion.teamId
  );

  return (
    <Card className={cn("overflow-hidden border-amber-400/30", compact ? "" : "mb-6")}>
      <div className="bg-gradient-to-r from-amber-400/15 via-transparent to-transparent p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Crown className="h-5 w-5 text-amber-400" />
          <h2 className="font-display text-xl font-bold">Tournament Winners</h2>
          <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/30">
            <Lock className="h-3 w-3" /> Official
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Champion */}
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 flex flex-col items-center text-center">
            <Crown className="h-6 w-6 text-amber-400 mb-2" />
            <TeamLogo name={champion.teamName} logoUrl={champion.teamLogo} size={56} />
            <p className="font-display font-bold mt-2">{champion.teamName}</p>
            <p className="text-xs text-muted-foreground">Champion · {champion.totalPoints} pts</p>
            {championPrize && (
              <p className="text-sm font-bold text-amber-400 mt-1">{formatMoney(championPrize.amount)}</p>
            )}
          </div>
          {runnerUp && (
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center text-center">
              <Medal className="h-6 w-6 text-slate-300 mb-2" />
              <TeamLogo name={runnerUp.teamName} logoUrl={runnerUp.teamLogo} size={48} />
              <p className="font-display font-bold mt-2">{runnerUp.teamName}</p>
              <p className="text-xs text-muted-foreground">Runner-Up · {runnerUp.totalPoints} pts</p>
            </div>
          )}
          {third && (
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center text-center">
              <Medal className="h-6 w-6 text-orange-400 mb-2" />
              <TeamLogo name={third.teamName} logoUrl={third.teamLogo} size={48} />
              <p className="font-display font-bold mt-2">{third.teamName}</p>
              <p className="text-xs text-muted-foreground">3rd Place · {third.totalPoints} pts</p>
            </div>
          )}
          {topKiller && (
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center text-center">
              <Skull className="h-6 w-6 text-rose-400 mb-2" />
              <TeamLogo name={topKiller.teamName} logoUrl={topKiller.teamLogo} size={48} />
              <p className="font-display font-bold mt-2">{topKiller.teamName}</p>
              <p className="text-xs text-muted-foreground">Highest Kills · {topKiller.kills}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function RuleBlock({ item }: { item: RuleItem }) {
  if (item.type === "bullets" || item.type === "numbered") {
    const lines = item.text.split("\n").filter((l) => l.trim());
    const ListTag = item.type === "numbered" ? "ol" : "ul";
    return (
      <ListTag
        className={cn(
          "my-3 space-y-1.5 text-sm text-muted-foreground pl-5",
          item.type === "numbered" ? "list-decimal" : "list-disc"
        )}
      >
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ListTag>
    );
  }
  if (item.type === "notice" || item.type === "warning") {
    const isWarning = item.type === "warning";
    return (
      <div
        className={cn(
          "my-3 rounded-lg border px-4 py-3 text-sm flex gap-3",
          isWarning
            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
            : "border-sky-500/30 bg-sky-500/10 text-sky-300"
        )}
      >
        {isWarning ? (
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        ) : (
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
        )}
        <span>{item.text}</span>
      </div>
    );
  }
  return <p className="my-3 text-sm text-muted-foreground leading-relaxed">{item.text}</p>;
}

export function RulesView({ rules }: { rules: RuleSection[] }) {
  if (!rules || rules.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="h-10 w-10" />}
        title="Rulebook not published yet"
        description="The tournament organizers have not published the official rulebook."
      />
    );
  }
  return (
    <div className="space-y-4">
      {rules.map((section, i) => (
        <Card key={i}>
          <CardContent className="p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <span className="grid place-items-center h-7 w-7 rounded-lg bg-primary/10 border border-primary/25 text-primary text-xs font-bold">
                {i + 1}
              </span>
              {section.category}
            </h3>
            <div className="mt-1">
              {section.items.map((item, j) => (
                <RuleBlock key={j} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MatchSchedule({ matches }: { matches: TournamentDetailData["matches"] }) {
  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-10 w-10" />}
        title="No matches yet"
        description="Match schedule has not been published yet."
      />
    );
  }
  return (
    <Card className="overflow-hidden">
      <TableWrap>
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted-foreground">
            <th className="py-3 px-4 text-center">Match</th>
            <th className="py-3 px-4 text-left">Date</th>
            <th className="py-3 px-4 text-left">Time</th>
            <th className="py-3 px-4 text-left">Map</th>
            <th className="py-3 px-4 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
              <td className="py-3 px-4 text-center font-display font-bold">#{String(m.matchNumber).padStart(2, "0")}</td>
              <td className="py-3 px-4">{formatDate(m.date)}</td>
              <td className="py-3 px-4">{formatTime(m.date)}</td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center gap-1.5">
                  <Map className="h-3.5 w-3.5 text-muted-foreground" /> {m.map}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <MatchStatusBadge status={m.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </Card>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function MatchListPublic({
  matches,
  live,
}: {
  matches: TournamentDetailData["matches"];
  live?: boolean;
}) {
  const liveMatches = matches.filter((m) => m.status === "LIVE");
  return (
    <div className="space-y-4">
      {live && liveMatches.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3">
          <span className="live-dot h-2.5 w-2.5 rounded-full bg-rose-500" />
          <p className="text-sm text-rose-300 font-medium">
            {liveMatches.length} match{liveMatches.length > 1 ? "es" : ""} LIVE right now — leaderboard
            updates automatically.
          </p>
        </div>
      )}
      {matches.length === 0 ? (
        <EmptyState
          icon={<Swords className="h-10 w-10" />}
          title="No matches yet"
          description="Matches appear here once the organizers schedule them."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <Card key={m.id} className="card-hover">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold">
                    Match #{String(m.matchNumber).padStart(2, "0")}
                  </span>
                  <MatchStatusBadge status={m.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> {formatDate(m.date)}
                  </span>
                  <span>{formatTime(m.date)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Map className="h-4 w-4 text-primary" /> {m.map}
                  </span>
                  <span className="text-muted-foreground">{m.mode}</span>
                </div>
                {m.roomPublished && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-3">
                    Room credentials released to registered teams in the Team Dashboard.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamsGrid({ teams }: { teams: TournamentDetailData["teams"] }) {
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="No teams registered yet"
        description="Be the first team to conquer this tournament."
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Card key={team.id} className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <TeamLogo name={team.name} logoUrl={team.logoUrl} size={48} />
              <div className="min-w-0">
                <h3 className="font-display font-bold truncate">{team.name}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Captain: {team.captainName}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {team.players.map((p) => (
                <Badge key={p.uid} variant="outline" className="bg-secondary border-border text-xs">
                  {p.ign}
                  {p.role !== "PLAYER" && p.role !== "SUBSTITUTE" && (
                    <span className="text-primary">· {p.role}</span>
                  )}
                </Badge>
              ))}
              {team.substitute.map((p) => (
                <Badge
                  key={p.uid}
                  variant="outline"
                  className="bg-violet-500/10 border-violet-500/30 text-violet-300 text-xs"
                >
                  {p.ign} · SUB
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnnouncementsList({
  announcements,
}: {
  announcements: TournamentDetailData["announcements"];
}) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone className="h-10 w-10" />}
        title="No announcements yet"
        description="Official updates from the organizers will appear here."
      />
    );
  }
  return (
    <div className="space-y-4">
      {announcements.map((a) => (
        <Card key={a.id} className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <PriorityBadge priority={a.priority} />
              <span className="text-xs text-muted-foreground">{timeAgo(a.publishAt)}</span>
            </div>
            <h3 className="font-display font-bold text-lg mt-3">{a.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">
              {a.description}
            </p>
            <p className="text-xs text-muted-foreground mt-3">{formatDateTime(a.publishAt)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PrizePoolView({ data }: { data: TournamentDetailData }) {
  const prizes = data.prizes.length > 0 ? data.prizes : data.tournament.prizeConfig;
  if (prizes.length === 0) {
    return (
      <EmptyState
        icon={<Coins className="h-10 w-10" />}
        title="Prize pool coming soon"
        description="The organizers have not announced the prize distribution yet."
      />
    );
  }
  const teamName = (id: string | null) =>
    id ? (data.teams.find((t) => t.id === id)?.name ?? data.leaderboard.find((l) => l.teamId === id)?.teamName) : null;

  return (
    <div className="space-y-4">
      <Card className="border-amber-400/25 bg-gradient-to-br from-amber-400/10 via-card to-card">
        <CardContent className="p-6 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Total Prize Pool</p>
          <p className="font-display text-4xl sm:text-5xl font-bold text-amber-400 mt-2">
            {formatMoney(data.tournament.prizePool)}
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prizes.map((p, i) => (
          <Card key={i} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">{p.name}</h3>
                {i < 3 && (
                  <Medal
                    className={cn(
                      "h-5 w-5",
                      i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : "text-orange-400"
                    )}
                  />
                )}
              </div>
              <p className="font-display text-2xl font-bold text-primary mt-2">{formatMoney(p.amount)}</p>
              {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
              {teamName((p as { winnerTeamId?: string | null }).winnerTeamId) && (
                <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Winner: {teamName((p as { winnerTeamId?: string | null }).winnerTeamId)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FaqView({
  faq,
  paymentMethods,
}: {
  faq: { q: string; a: string }[];
  paymentMethods: { name: string; number: string; type: string }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <SectionHeader title="Frequently Asked Questions" />
        {faq.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-10 w-10" />}
            title="No FAQ yet"
            description="Common questions will be published here."
          />
        ) : (
          faq.map((f, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm">{f.q}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{f.a}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <div className="space-y-4">
        <SectionHeader title="Payment Methods" subtitle="Accepted for entry fees" />
        {paymentMethods.length === 0 ? (
          <EmptyState
            icon={<Coins className="h-10 w-10" />}
            title="No payment methods configured"
            description="Organizers have not configured payment methods yet."
          />
        ) : (
          paymentMethods.map((m) => (
            <Card key={m.number}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.type}</p>
                </div>
                <code className="rounded-md bg-secondary border border-border px-3 py-1.5 text-sm">
                  {m.number}
                </code>
              </CardContent>
            </Card>
          ))
        )}
        {paymentMethods.length > 0 && (
          <Card className="border-sky-500/25 bg-sky-500/5">
            <CardContent className="p-4 flex gap-3">
              <Info className="h-4 w-4 text-sky-300 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Never send money to personal accounts claiming to be organizers. Only use the numbers
                listed above, and always keep your transaction receipt.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
