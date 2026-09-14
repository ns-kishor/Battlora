"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DoorOpen, Lock, Map, RefreshCw } from "lucide-react";
import { useApiData } from "../data-hooks";
import { useRouter } from "../router";
import { EmptyState, LoadingRows, MatchStatusBadge, SectionHeader } from "../shared/kit";
import { CopyField } from "../shared/copy-field";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type DashboardData = {
  matches: {
    id: string;
    matchNumber: number;
    date: string;
    map: string;
    status: string;
    roomPublished: boolean;
    roomId: string | null;
    roomPassword: string | null;
    roomAvailableAt: string | null;
  }[];
};

export function RoomDetails() {
  const { navigate } = useRouter();
  const { data, loading, refetch } = useApiData<DashboardData>("/api/me/dashboard", {
    refreshMs: 20_000,
  });

  if (loading) return <LoadingRows count={3} />;

  const matches = (data?.matches ?? []).filter((m) => m.roomPublished);
  if (matches.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Room Details" subtitle="Match lobby credentials" />
        <EmptyState
          icon={<DoorOpen className="h-10 w-10" />}
          title="No rooms published yet"
          description="Room ID and Password appear here the moment organizers publish them. Credentials stay hidden until the official release time."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Room Details"
        subtitle="Credentials are hidden until the configured release time"
        action={
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {matches.map((m) => (
          <Card
            key={m.id}
            className={cn(
              "card-hover",
              m.status === "LIVE" && "border-rose-500/40",
              m.roomAvailableAt && "opacity-90"
            )}
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-bold">
                    Match #{String(m.matchNumber).padStart(2, "0")}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Map className="h-3 w-3" /> {m.map} · {formatDate(m.date)} {formatTime(m.date)}
                  </p>
                </div>
                <MatchStatusBadge status={m.status} />
              </div>

              {m.roomAvailableAt ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Lock className="h-4 w-4" />
                    <p className="text-sm font-medium">Credentials locked</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-background/60 border border-border px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Room ID</p>
                      <p className="font-mono tracking-widest text-muted-foreground">••••••••</p>
                    </div>
                    <div className="rounded-lg bg-background/60 border border-border px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Password</p>
                      <p className="font-mono tracking-widest text-muted-foreground">••••••••</p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-400 font-medium text-center">
                    Available at {formatTime(m.roomAvailableAt)}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  <CopyField label="Room ID" value={m.roomId} />
                  <CopyField label="Password" value={m.roomPassword} secret />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        ⚠ Never share room credentials outside your team — leaking rooms may lead to penalties.
      </p>
    </div>
  );
}
