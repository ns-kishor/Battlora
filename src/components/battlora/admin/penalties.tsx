"use client";

import { useApiData } from "../data-hooks";
import { EmptyState, LoadingRows, PenaltyTypeBadge, SectionHeader } from "../shared/kit";
import { api } from "@/lib/api-client";
import { timeAgo } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type PenaltiesData = {
  penalties: {
    id: string;
    type: string;
    value: number;
    reason: string;
    active: boolean;
    createdAt: string;
    team: { name: string } | null;
    tournament: { name: string };
    issuer: { name: string };
  }[];
};

export function AdminPenalties() {
  const { data, loading, refetch } = useApiData<PenaltiesData>("/api/penalties");

  async function revoke(id: string) {
    try {
      await api("/api/penalties", { method: "PATCH", json: { id, active: false } });
      toast({ title: "Penalty revoked", description: "Affected leaderboards were recalculated." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  if (loading) return <LoadingRows count={4} />;
  const penalties = data?.penalties ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Penalties"
        subtitle="All penalties across tournaments — apply new ones from a tournament's Control Center"
      />
      {penalties.length === 0 ? (
        <EmptyState
          icon={<span className="text-3xl">⚖️</span>}
          title="No penalties issued"
          description="Penalties applied from tournament control centers appear here with a full audit trail."
        />
      ) : (
        <div className="space-y-3">
          {penalties.map((p) => (
            <Card key={p.id} className={p.active ? "" : "opacity-50"}>
              <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PenaltyTypeBadge type={p.type} />
                    {p.value > 0 && <span className="font-display font-bold text-amber-400">−{p.value}</span>}
                    {p.team && <span className="font-medium">{p.team.name}</span>}
                    <span className="text-xs text-muted-foreground">· {p.tournament.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Issued by {p.issuer.name} · {timeAgo(p.createdAt)}
                    {!p.active && " · REVOKED"}
                  </p>
                </div>
                {p.active && (
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => revoke(p.id)}>
                    Revoke
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
