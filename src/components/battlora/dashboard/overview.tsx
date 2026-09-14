"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Bell, CheckCircle2, CreditCard, Crown, DoorOpen, Map, Skull, Swords, Target, Trophy, Users, Zap } from "lucide-react";
import { useRouter } from "../router";
import { useApiData } from "../data-hooks";
import {
  EmptyState,
  LoadingRows,
  RegistrationStatusBadge,
  SectionHeader,
  StatCard,
  TeamLogo,
  TournamentStatusBadge,
} from "../shared/kit";
import { formatDate, formatMoney, formatTime, ordinal, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type DashboardData = {
  team: {
    id: string;
    name: string;
    logoUrl: string | null;
    status: string;
    players: { id: string; ign: string; uid: string; role: string; status: string; isSubstitute: boolean }[];
  } | null;
  registrations: {
    id: string;
    regId: string;
    status: string;
    reviewNote: string | null;
    submittedAt: string;
    tournament: { id: string; name: string; status: string; entryFee: number; prizePool: number; mode: string; game: string };
    payment: { id: string; method: string; transactionId: string; status: string; amount: number; rejectionReason: string | null } | null;
  }[];
  activeTournamentId: string | null;
  standings: {
    tournament: { id: string; name: string; status: string; resultsLocked: boolean };
    myRow: { rank: number; totalPoints: number; kills: number; booyah: number; matchesPlayed: number; bestPlacement: number | null; pointDeduction: number } | null;
    totalTeams: number;
  } | null;
  matches: {
    id: string;
    matchNumber: number;
    date: string;
    map: string;
    status: string;
    resultPublished: boolean;
    roomPublished: boolean;
    roomId: string | null;
    roomPassword: string | null;
    roomAvailableAt: string | null;
    myPlacement: number | null;
    myKills: number | null;
    myPoints: number | null;
  }[];
  notifications: { id: string; title: string; message: string; read: boolean; createdAt: string; type: string }[];
};

export function DashboardOverview() {
  const { navigate } = useRouter();
  const { data, loading, error } = useApiData<DashboardData>("/api/me/dashboard", { refreshMs: 45_000 });

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingRows count={3} />
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={<AlertTriangle className="h-10 w-10" />} title="Could not load dashboard" description={error} />;
  }

  if (!data?.team) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="You don't have a team yet"
          description="Register for a tournament to create your team, or browse upcoming competitions."
          action={
            <Button className="btn-primary-glow" onClick={() => navigate("/tournaments")}>
              <Swords className="h-4 w-4" /> Find a Tournament
            </Button>
          }
        />
      </div>
    );
  }

  const { team, registrations, standings, matches, notifications } = data;
  const primaryReg = registrations.find((r) => standings && r.tournament.id === standings.tournament.id) ?? registrations[0];
  const nextMatch = matches.find((m) => !m.resultPublished && m.status !== "CANCELLED");
  const latestResults = matches.filter((m) => m.resultPublished).slice(-3).reverse();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Tournament header card */}
      {primaryReg && (
        <Card className="overflow-hidden border-primary/20">
          <div className="bg-gradient-to-r from-primary/12 via-transparent to-transparent p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Active tournament</p>
                <h1 className="font-display text-xl sm:text-2xl font-bold mt-1 truncate">{primaryReg.tournament.name}</h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <TournamentStatusBadge status={primaryReg.tournament.status} />
                  <RegistrationStatusBadge status={primaryReg.status} />
                  <span className="text-xs text-muted-foreground font-mono">{primaryReg.regId}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/tournaments/${primaryReg!.tournament.id}`)}>
                View Tournament <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Status banners */}
      {primaryReg?.status === "PAYMENT_PENDING" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center gap-3">
          <CreditCard className="h-5 w-5 text-amber-400" />
          <p className="text-sm flex-1 min-w-40">
            <strong>Payment pending verification.</strong>{" "}
            {primaryReg.payment?.rejectionReason
              ? `Previous payment rejected: ${primaryReg.payment.rejectionReason}. Submit a new payment.`
              : "Your entry fee payment is awaiting verification by the finance team."}
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/payment")}>
            View Payment
          </Button>
        </div>
      )}
      {primaryReg?.status === "UNDER_REVIEW" && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 flex flex-wrap items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-violet-300" />
          <p className="text-sm flex-1 min-w-40">
            <strong>Payment verified.</strong> Your registration is under admin review — you'll be notified once approved.
          </p>
        </div>
      )}
      {primaryReg?.status === "REJECTED" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <p className="text-sm">
            <strong>Registration rejected.</strong> {primaryReg.reviewNote ?? "Contact support for details."}
          </p>
        </div>
      )}

      {/* KPI summary (PRD 11) */}
      {standings?.myRow && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <StatCard label="Current Rank" value={`#${String(standings.myRow.rank).padStart(2, "0")}`} hint={`of ${standings.totalTeams} teams`} icon={<Trophy className="h-4 w-4" />} />
          <StatCard label="Total Points" value={standings.myRow.totalPoints} icon={<Target className="h-4 w-4" />} accent="success" />
          <StatCard label="Total Kills" value={standings.myRow.kills} icon={<Skull className="h-4 w-4" />} accent="danger" />
          <StatCard label="Booyah" value={standings.myRow.booyah} icon={<Crown className="h-4 w-4" />} accent="warning" />
          <StatCard label="Matches Played" value={standings.myRow.matchesPlayed} icon={<Swords className="h-4 w-4" />} accent="muted" />
          <StatCard
            label="Best Placement"
            value={standings.myRow.bestPlacement ? ordinal(standings.myRow.bestPlacement) : "—"}
            icon={<Zap className="h-4 w-4" />}
            accent="muted"
          />
        </div>
      )}
      {standings?.myRow && standings.myRow.pointDeduction > 0 && (
        <p className="text-xs text-amber-400">
          ⚠ {standings.myRow.pointDeduction} points deducted by active penalties.
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Next match */}
        <div className="space-y-4">
          <SectionHeader title="Next Match" />
          {nextMatch ? (
            <Card className="card-hover">
              <CardContent className="p-5 flex items-center gap-4">
                <span className="grid place-items-center h-14 w-14 rounded-xl bg-primary/10 border border-primary/25 font-display text-xl font-bold text-primary shrink-0">
                  #{String(nextMatch.matchNumber).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    <Map className="inline h-4 w-4 mr-1.5 text-muted-foreground" />
                    {nextMatch.map}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(nextMatch.date)} · {formatTime(nextMatch.date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {nextMatch.roomAvailableAt && (
                    <>
                      <p className="text-xs text-muted-foreground">Room unlocks</p>
                      <p className="text-sm font-medium text-amber-400">{formatTime(nextMatch.roomAvailableAt)}</p>
                    </>
                  )}
                  {nextMatch.roomId && (
                    <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/rooms")}>
                      <DoorOpen className="h-3.5 w-3.5" /> Room Ready
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Swords className="h-8 w-8" />}
              title="No upcoming matches"
              description={standings ? "All scheduled matches are completed." : "Match schedule appears after your registration is approved."}
            />
          )}

          {/* Recent results */}
          <SectionHeader title="Recent Results" />
          {latestResults.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" />}
              title="No results yet"
              description="Your match results will appear here once published."
            />
          ) : (
            <div className="space-y-2">
              {latestResults.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        Match #{String(m.matchNumber).padStart(2, "0")} · {m.map}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <p className="text-xs text-muted-foreground">Place</p>
                        <p className={cn("font-display font-bold", m.myPlacement === 1 && "text-amber-400")}>
                          {m.myPlacement ? ordinal(m.myPlacement) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Kills</p>
                        <p className="font-display font-bold text-rose-400">{m.myKills ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pts</p>
                        <p className="font-display font-bold text-primary text-lg">{m.myPoints ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate("/dashboard/results")}>
                View all results <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Team + notifications */}
        <div className="space-y-4">
          <SectionHeader
            title="My Team"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/team")}>
                Manage
              </Button>
            }
          />
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <TeamLogo name={team.name} logoUrl={team.logoUrl} size={52} />
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.players.filter((p) => !p.isSubstitute).length} players ·{" "}
                    {team.players.some((p) => p.isSubstitute) ? "1 substitute" : "no substitute"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {team.players.slice(0, 5).map((p) => (
                  <span key={p.id} className="rounded-md bg-secondary border border-border px-2 py-1 text-xs">
                    {p.ign}
                    {p.isSubstitute && <span className="text-violet-300"> · SUB</span>}
                  </span>
                ))}
                {team.players.length > 5 && (
                  <span className="rounded-md bg-secondary border border-border px-2 py-1 text-xs text-muted-foreground">
                    +{team.players.length - 5}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <SectionHeader
            title="Notifications"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/notifications")}>
                View all
              </Button>
            }
          />
          {notifications.length === 0 ? (
            <EmptyState icon={<Bell className="h-8 w-8" />} title="No notifications" description="You're all caught up." />
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-lg border p-3.5 text-sm",
                    n.read ? "border-border bg-card/50" : "border-primary/25 bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{n.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registrations list */}
      <div>
        <SectionHeader title="My Registrations" subtitle="All tournaments your team entered" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {registrations.map((reg) => (
            <Card key={reg.id} className="card-hover">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold truncate">{reg.tournament.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{reg.regId}</p>
                  </div>
                  <RegistrationStatusBadge status={reg.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {reg.tournament.game} · {reg.tournament.mode}
                  </span>
                  <span>Prize: {formatMoney(reg.tournament.prizePool)}</span>
                </div>
                {reg.payment && (
                  <div className="flex items-center justify-between text-xs border-t border-border pt-2.5">
                    <span className="text-muted-foreground">
                      Payment: {reg.payment.method} · {reg.payment.transactionId}
                    </span>
                    <RegistrationStatusBadge status={reg.payment.status} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
