"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Shield } from "lucide-react";
import { useApiData } from "../data-hooks";
import { EmptyState, LoadingRows, SectionHeader, TeamLogo, StatusBadge } from "../shared/kit";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

type PlayersData = {
  players: {
    id: string;
    realName: string;
    ign: string;
    uid: string;
    phone: string | null;
    role: string;
    status: string;
    isSubstitute: boolean;
    createdAt: string;
    team: {
      name: string;
      logoUrl: string | null;
      captain: { name: string };
      registrations: { tournament: { name: string; status: string } }[];
    };
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  SUSPENDED: "Suspended",
  BANNED: "Banned",
};

export function AdminPlayers() {
  const { data, loading, refetch } = useApiData<PlayersData>("/api/admin/players");
  const [q, setQ] = useState("");

  const players = (data?.players ?? []).filter(
    (p) => !q || p.ign.toLowerCase().includes(q.toLowerCase()) || p.uid.includes(q) || p.realName.toLowerCase().includes(q.toLowerCase())
  );

  async function setStatus(id: string, status: string) {
    try {
      await api(`/api/admin/players/${id}`, { method: "PATCH", json: { status } });
      toast({ title: `Player ${status.toLowerCase()}` });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Players" subtitle="Search by IGN or UID · verify, suspend or ban (PRD 13)" />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search IGN, UID or real name…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <LoadingRows count={5} />
      ) : players.length === 0 ? (
        <EmptyState icon={<Shield className="h-10 w-10" />} title="No players found" description="Player profiles appear here after team registration." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {players.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{p.ign}</p>
                      {p.role !== "PLAYER" && p.role !== "SUBSTITUTE" && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-[10px]">{p.role}</Badge>
                      )}
                      {p.isSubstitute && (
                        <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30 text-[10px]">SUB</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">UID {p.uid}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.realName}</p>
                  </div>
                  <StatusBadge status={p.status} labels={STATUS_LABELS} />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TeamLogo name={p.team.name} logoUrl={p.team.logoUrl} size={22} />
                  <span className="truncate">{p.team.name}</span>
                  <span className="ml-auto shrink-0">{formatDate(p.createdAt)}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {p.status !== "VERIFIED" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(p.id, "VERIFIED")}>Verify</Button>
                  )}
                  {p.status !== "SUSPENDED" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(p.id, "SUSPENDED")}>Suspend</Button>
                  )}
                  {p.status !== "BANNED" ? (
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setStatus(p.id, "BANNED")}>Ban</Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(p.id, "VERIFIED")}>Unban</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
