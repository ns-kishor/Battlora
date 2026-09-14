"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Coins, Trophy, Users } from "lucide-react";
import { useRouter } from "../router";
import { TournamentStatusBadge } from "./kit";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TournamentCardData = {
  id: string;
  slug: string;
  name: string;
  bannerUrl?: string | null;
  status: string;
  game: string;
  mode: string;
  entryFee: number;
  prizePool: number;
  teamLimit: number;
  registeredTeams: number;
  registrationEnd?: string | null;
  tournamentStart?: string | null;
  featured?: boolean;
};

export function TournamentCard({ t }: { t: TournamentCardData }) {
  const { navigate } = useRouter();
  const open = t.status === "REGISTRATION_OPEN";
  const fill = Math.min(100, Math.round((t.registeredTeams / Math.max(1, t.teamLimit)) * 100));
  const slotsLeft = Math.max(0, t.teamLimit - t.registeredTeams);
  const urgent = open && slotsLeft > 0 && slotsLeft <= Math.max(4, Math.ceil(t.teamLimit * 0.15));

  return (
    <Card
      className="card-hover cursor-pointer overflow-hidden group"
      onClick={() => navigate(`/tournaments/${t.slug ?? t.id}`)}
    >
      <div className="relative h-40 sm:h-44 overflow-hidden banner-scrim bg-gradient-to-br from-primary/25 via-card to-background">
        {t.bannerUrl ? (
           
          <img
            src={t.bannerUrl}
            alt={`${t.name} banner`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <Trophy className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <TournamentStatusBadge status={t.status} />
        </div>
        {t.featured && (
          <span className="absolute top-3 right-3 z-10 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1">
            Featured
          </span>
        )}
        {/* Prize chip over artwork */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
          <span className="prize-shimmer inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 px-2 py-1 text-xs font-bold text-amber-200 backdrop-blur-sm">
            <Coins className="h-3.5 w-3.5" /> {formatMoney(t.prizePool)}
          </span>
          {urgent && (
            <span className="inline-flex items-center rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-sm">
              {slotsLeft} slots left
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {t.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.game} · {t.mode} · {t.teamLimit} teams
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Prize Pool</p>
              <p className="font-semibold truncate">{formatMoney(t.prizePool)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-sky-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">
                {open ? "Reg. Deadline" : "Starts"}
              </p>
              <p className="font-semibold truncate">
                {formatDate(open ? t.registrationEnd : t.tournamentStart)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t.registeredTeams}/{t.teamLimit} teams
            </span>
            <span className={cn(open ? (urgent ? "text-amber-400 font-semibold" : "text-emerald-400 font-medium") : "")}>
              {open
                ? urgent
                  ? `Only ${slotsLeft} slots left`
                  : "Registration Open"
                : `Entry ${t.entryFee > 0 ? formatMoney(t.entryFee) : "Free"}`}
            </span>
          </div>
          <Progress value={fill} className="h-1.5" />
        </div>

        <Button
          className="w-full"
          variant={open ? "default" : "secondary"}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/tournaments/${t.slug ?? t.id}`);
          }}
        >
          {open ? "Register Now" : "View Tournament"}
        </Button>
      </CardContent>
    </Card>
  );
}
