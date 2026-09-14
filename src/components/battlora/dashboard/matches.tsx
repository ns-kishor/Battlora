"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Map, Swords } from "lucide-react";
import { useApiData } from "../data-hooks";
import { useRouter } from "../router";
import { EmptyState, LoadingRows, MatchStatusBadge, SectionHeader } from "../shared/kit";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type DashboardData = {
  standings: { tournament: { name: string } } | null;
  matches: {
    id: string;
    matchNumber: number;
    date: string;
    map: string;
    status: string;
    resultPublished: boolean;
    roomPublished: boolean;
    roomId: string | null;
    roomAvailableAt: string | null;
    myPlacement: number | null;
    myKills: number | null;
    myPoints: number | null;
  }[];
};

export function DashboardMatches() {
  const { navigate } = useRouter();
  const { data, loading } = useApiData<DashboardData>("/api/me/dashboard");

  if (loading) return <LoadingRows count={4} />;

  const matches = data?.matches ?? [];
  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<Swords className="h-10 w-10" />}
        title="No match schedule yet"
        description="Match schedule has not been published yet. You'll be notified when rooms go live."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Match Schedule"
        subtitle={data?.standings?.tournament.name ?? "Your active tournament"}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {matches.map((m) => (
          <Card key={m.id} className={cn("card-hover", m.status === "LIVE" && "border-rose-500/40")}>
            <CardContent className="p-5 space-y-3">
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
              <div className="flex items-center gap-2 text-sm">
                <Map className="h-4 w-4 text-primary" /> {m.map}
              </div>
              {m.resultPublished && m.myPlacement !== null && (
                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Your result</span>
                  <span className="font-display font-bold">
                    #{m.myPlacement} · {m.myKills} kills ·{" "}
                    <span className="text-primary">{m.myPoints} pts</span>
                  </span>
                </div>
              )}
              {m.roomAvailableAt && (
                <p className="text-xs text-amber-400 border-t border-border pt-3">
                  Room credentials unlock at {formatTime(m.roomAvailableAt)}
                </p>
              )}
              {m.roomId && (
                <button
                  className="text-xs text-primary hover:underline cursor-pointer border-t border-border pt-3 w-full text-left"
                  onClick={() => navigate("/dashboard/rooms")}
                >
                  Room credentials available → open Room Details
                </button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
