"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, Users } from "lucide-react";
import { useApiData } from "../data-hooks";
import {
  EmptyState,
  LoadingRows,
  SectionHeader,
  TeamLogo,
  TeamStatusBadge,
  RegistrationStatusBadge,
} from "../shared/kit";
import { ConfirmDialog } from "../shared/copy-field";
import { api } from "@/lib/api-client";
import { timeAgo } from "@/lib/format";

type TeamsData = {
  teams: {
    id: string;
    name: string;
    logoUrl: string | null;
    status: string;
    captain: { name: string; email: string; phone: string | null };
    players: { id: string; ign: string; uid: string; status: string; isSubstitute: boolean }[];
    registrations: { id: string; status: string; tournament: { name: string } }[];
    _count: { complaints: number; penalties: number };
    createdAt: string;
  }[];
};

export function AdminTeams() {
  const { data, loading, refetch } = useApiData<TeamsData>("/api/admin/teams");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const teams = (data?.teams ?? []).filter((t) => {
    if (q && !t.name.toLowerCase().includes(q.toLowerCase()) && !t.players.some((p) => p.uid.includes(q))) return false;
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    return true;
  });

  async function setStatus(id: string, status: string) {
    try {
      await api(`/api/admin/teams/${id}`, { method: "PATCH", json: { status } });
      toast({ title: `Team ${status.toLowerCase()}`, description: "The captain has been notified." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Teams" subtitle="Search teams and players by name or UID (PRD 42)" />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search team name or UID…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {["ALL", "PENDING", "VERIFIED", "SUSPENDED", "BANNED"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingRows count={5} />
      ) : teams.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="No teams found" description="Teams appear here as captains register." />
      ) : (
        <div className="space-y-3">
          {teams.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamLogo name={t.name} logoUrl={t.logoUrl} size={44} />
                    <div className="min-w-0">
                      <p className="font-display font-bold truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.captain.name} · {t.captain.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamStatusBadge status={t.status} />
                    <Badge variant="outline" className="bg-secondary border-border">
                      {t.players.filter((p) => !p.isSubstitute).length}P
                      {t.players.some((p) => p.isSubstitute) ? "+S" : ""}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {t.players.map((p) => (
                    <span key={p.id} className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs">
                      {p.ign} <span className="text-muted-foreground font-mono">{p.uid}</span>
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {t.registrations.map((r) => (
                      <span key={r.id} className="text-xs text-muted-foreground">
                        {r.tournament.name}: <RegistrationStatusBadge status={r.status} />
                      </span>
                    ))}
                    {t.registrations.length === 0 && <span className="text-xs text-muted-foreground">No registrations</span>}
                  </div>
                  <div className="flex gap-2">
                    {t.status !== "VERIFIED" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "VERIFIED")}>Verify</Button>
                    )}
                    {t.status !== "SUSPENDED" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "SUSPENDED")}>Suspend</Button>
                    )}
                    {t.status !== "BANNED" ? (
                      <ConfirmDialog
                        trigger={<Button size="sm" variant="destructive">Ban</Button>}
                        title="Ban this team?"
                        description="All of the team's registrations will be marked BANNED and they will be excluded from leaderboards. This is a destructive action."
                        confirmLabel="Ban Team"
                        onConfirm={() => setStatus(t.id, "BANNED")}
                      />
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "VERIFIED")}>Unban</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
