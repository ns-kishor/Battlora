"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Coins,
  Flame,
  Megaphone,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "../router";
import { useAuth } from "../auth-context";
import { useSettings } from "../settings-context";
import { useApiData } from "../data-hooks";
import { TournamentCard, type TournamentCardData } from "../shared/tournament-card";
import { SectionHeader, EmptyState, LoadingGrid, PriorityBadge } from "../shared/kit";
import { formatDate, formatMoney, timeAgo } from "@/lib/format";

const REGISTER_VERIFY_COMPETE = [
  {
    icon: Users,
    title: "Register",
    text: "Create your team, add players and submit entry payment in minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    text: "Admins verify identity and payments so every lobby is legitimate.",
  },
  {
    icon: Swords,
    title: "Compete",
    text: "Get match schedules and room credentials exactly when you need them.",
  },
  {
    icon: Trophy,
    title: "Conquer",
    text: "Automatic scoring, transparent leaderboards and prize management.",
  },
];

export function Home() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { bootstrap } = useSettings();
  const { data: tournamentsData, loading } = useApiData<{ tournaments: TournamentCardData[] }>(
    "/api/tournaments"
  );

  const stats = bootstrap?.stats;
  const featured = tournamentsData?.tournaments.find((t) => t.featured) ?? tournamentsData?.tournaments[0];
  const rest = (tournamentsData?.tournaments ?? [])
    .filter((t) => t.id !== featured?.id)
    .slice(0, 3);
  const announcements = bootstrap?.announcements ?? [];

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="hero-art relative overflow-hidden border-b border-border">
        <img src="/images/hero-bg.png" alt="" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl animate-in-up">
            <Badge variant="outline" className="mb-5 bg-primary/10 border-primary/30 text-primary gap-1.5 px-3 py-1">
              <Flame className="h-3.5 w-3.5" /> Professional Free Fire Esports
            </Badge>
            <h1 className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
              <span className="text-gradient text-glow">BATTLE.</span>{" "}
              <span className="text-foreground">COMPETE.</span>{" "}
              <span className="text-gradient text-glow">CONQUER.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl">
              Compete in professional Free Fire tournaments, climb the leaderboard and prove your
              team. From registration to prize distribution — everything runs on one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="btn-primary-glow text-base px-7"
                onClick={() => navigate("/tournaments")}
              >
                Join Tournament <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-7 glass"
                onClick={() => navigate("/tournaments")}
              >
                View Tournaments
              </Button>
            </div>

            {/* Live now chip */}
            {featured?.status === "ONGOING" && (
              <button
                onClick={() => navigate(`/tournaments/${featured.slug ?? featured.id}`)}
                className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-rose-500/40 bg-rose-500/10 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                </span>
                {featured.name} — Match in progress
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Hero statistics */}
          <div className="mt-12 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Active Tournaments", value: stats?.activeTournaments ?? "—", icon: Swords },
              { label: "Registered Teams", value: stats?.registeredTeams ?? "—", icon: Users },
              { label: "Total Players", value: stats?.totalPlayers ?? "—", icon: Zap },
              {
                label: "Total Prize Pool",
                value: stats ? formatMoney(stats.totalPrizePool) : "—",
                icon: Coins,
              },
            ].map((s) => (
              <Card key={s.label} className="glass hud-corners card-hover">
                <CardContent className="p-4 sm:p-5 flex items-center gap-3">
                  <span className="grid place-items-center rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-primary shrink-0">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="font-display text-xl sm:text-2xl font-bold truncate">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 space-y-12 sm:space-y-16">
        {/* ---------------- FEATURED TOURNAMENT ---------------- */}
        {featured && (
          <section aria-labelledby="featured-heading">
            <SectionHeader
              title="Featured Tournament"
              subtitle="The spotlight event you don't want to miss"
            />
            <Card className="mt-5 overflow-hidden card-hover hud-corners">
              <div className="grid lg:grid-cols-5">
                <div className="relative lg:col-span-2 h-56 sm:h-64 lg:h-auto banner-scrim bg-gradient-to-br from-primary/30 via-card to-background">
                  {featured.bannerUrl ? (
                    
                    <img
                      src={featured.bannerUrl}
                      alt={`${featured.name} banner`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center">
                      <Trophy className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 z-0 bg-gradient-to-t lg:bg-gradient-to-r from-card via-transparent to-transparent" />
                  {/* Prize chip on artwork */}
                  <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-2">
                    <span className="prize-shimmer inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 px-2.5 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-sm">
                      <Coins className="h-3.5 w-3.5" /> {formatMoney(featured.prizePool)}
                    </span>
                    {featured.status === "ONGOING" && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" /> Live
                      </span>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-3 p-5 sm:p-7 space-y-5">
                  <div id="featured-heading" className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-display text-2xl font-bold">{featured.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {featured.game} · {featured.mode} · up to {featured.teamLimit} teams
                      </p>
                    </div>
                    {featured.status === "REGISTRATION_OPEN" && (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 gap-1.5">
                        <Zap className="h-3 w-3" /> Registration Open
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Prize Pool</p>
                      <p className="font-display text-xl font-bold text-amber-400">
                        {formatMoney(featured.prizePool)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Entry Fee</p>
                      <p className="font-display text-xl font-bold">
                        {featured.entryFee > 0 ? formatMoney(featured.entryFee) : "Free"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Teams</p>
                      <p className="font-display text-xl font-bold">
                        {featured.registeredTeams}/{featured.teamLimit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Tournament Date</p>
                      <p className="font-display text-xl font-bold">
                        {formatDate(featured.tournamentStart)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" /> Registration deadline:{" "}
                        {formatDate(featured.registrationEnd)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (featured.registeredTeams / featured.teamLimit) * 100)}
                      className="h-1.5"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={featured.status === "REGISTRATION_OPEN" ? "default" : "secondary"}
                      className="btn-primary-glow"
                      onClick={() => navigate(`/tournaments/${featured.slug ?? featured.id}`)}
                    >
                      View Tournament
                    </Button>
                    {featured.status === "REGISTRATION_OPEN" && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(`/join/${featured.slug ?? featured.id}`)
                        }
                      >
                        {user ? "Register Now" : "Login & Register"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* ---------------- UPCOMING TOURNAMENTS ---------------- */}
        <section aria-labelledby="tournaments-heading">
          <SectionHeader
            title="Tournaments"
            subtitle="Browse every competition on the platform"
            action={
              <Button variant="outline" onClick={() => navigate("/tournaments")}>
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          <div className="mt-5" id="tournaments-heading">
            {loading ? (
              <LoadingGrid count={3} />
            ) : rest.length === 0 && !featured ? (
              <EmptyState
                icon={<Swords className="h-10 w-10" />}
                title="No tournaments yet"
                description="New competitions are being prepared. Check back soon."
              />
            ) : (
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((t) => (
                  <TournamentCard key={t.id} t={t} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <section aria-labelledby="how-heading">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 id="how-heading" className="font-display text-2xl sm:text-3xl font-bold">
              Register <span className="text-primary">→</span> Verify <span className="text-primary">→</span>{" "}
              Compete <span className="text-primary">→</span> Score <span className="text-primary">→</span>{" "}
              Rank <span className="text-primary">→</span> Win
            </h2>
            <p className="text-muted-foreground mt-3">
              Everything the tournament admins do manually becomes a controlled digital workflow —
              transparent scoring, live leaderboards and fair-play enforcement.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REGISTER_VERIFY_COMPETE.map((step, i) => (
              <Card key={step.title} className="card-hover">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="grid place-items-center rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-primary">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-3xl font-bold text-border">0{i + 1}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------------- ANNOUNCEMENTS ---------------- */}
        {announcements.length > 0 && (
          <section aria-labelledby="announcements-heading">
            <SectionHeader
              title="Latest Announcements"
              subtitle="News from the tournament organizers"
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2" id="announcements-heading">
              {announcements.slice(0, 4).map((a) => (
                <Card key={a.id} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <PriorityBadge priority={a.priority} />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Megaphone className="h-3 w-3" /> {timeAgo(a.publishAt)}
                      </span>
                    </div>
                    <h3 className="font-display font-bold mt-3">{a.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3">{a.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ---------------- CTA BANNER ---------------- */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/25">
          <img src="/images/cta-bg.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-background/85 via-background/70 to-primary/10" />
          <div className="relative p-8 sm:p-12 text-center">
            <span className="mx-auto mb-4 grid place-items-center rounded-xl border border-primary/30 bg-primary/10 p-3 text-primary hud-corners">
              <Bell className="h-6 w-6" />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              Ready to lead your squad to <span className="text-gradient text-glow">Booyah?</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              Create your team, pick a tournament and start your journey to the top of the
              leaderboard today.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="btn-primary-glow" onClick={() => navigate("/tournaments")}>
                <Swords className="h-4 w-4" /> Find a Tournament
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="glass" onClick={() => navigate("/register")}>
                  Create Free Account
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
