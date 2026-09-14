"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Activity, Search } from "lucide-react";
import { useState } from "react";
import { useApiData } from "../data-hooks";
import { EmptyState, LoadingRows, SectionHeader } from "../shared/kit";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type ActivityData = {
  logs: {
    id: string;
    userName: string;
    action: string;
    entity: string;
    entityId: string | null;
    previousValue: string | null;
    newValue: string | null;
    createdAt: string;
  }[];
  total: number;
};

const ENTITY_COLORS: Record<string, string> = {
  Tournament: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  Match: "text-sky-300 bg-sky-500/10 border-sky-500/25",
  Payment: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  Registration: "text-violet-300 bg-violet-500/10 border-violet-500/25",
  Penalty: "text-rose-400 bg-rose-500/10 border-rose-500/25",
  Complaint: "text-rose-300 bg-rose-500/5 border-rose-500/20",
  Team: "text-primary bg-primary/10 border-primary/25",
  Player: "text-primary bg-primary/10 border-primary/25",
  User: "text-slate-300 bg-secondary border-border",
  Announcement: "text-amber-300 bg-amber-500/5 border-amber-500/20",
  Settings: "text-slate-300 bg-secondary border-border",
};

export function AdminActivity() {
  const { data, loading } = useApiData<ActivityData>("/api/admin/activity?take=100", { refreshMs: 20_000 });
  const [q, setQ] = useState("");

  const logs = (data?.logs ?? []).filter(
    (l) => !q || l.userName.toLowerCase().includes(q.toLowerCase()) || l.action.toLowerCase().includes(q.toLowerCase()) || l.entity.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Activity Logs"
        subtitle={`${data?.total ?? 0} audited actions — every critical change is traceable (PRD 41, 57)`}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter by admin, action or entity…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <LoadingRows count={6} />
      ) : logs.length === 0 ? (
        <EmptyState icon={<Activity className="h-10 w-10" />} title="No activity yet" description="Admin actions will be logged here automatically." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60 max-h-[70vh] overflow-y-auto">
              {logs.map((log) => {
                let prev: unknown = null;
                let next: unknown = null;
                try {
                  prev = log.previousValue ? JSON.parse(log.previousValue) : null;
                  next = log.newValue ? JSON.parse(log.newValue) : null;
                } catch {
                  /* not JSON */
                }
                return (
                  <div key={log.id} className="px-4 py-3.5 flex gap-3 hover:bg-secondary/30 transition-colors">
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[10px] font-bold",
                        ENTITY_COLORS[log.entity] ?? "bg-secondary border-border text-muted-foreground"
                      )}
                    >
                      {log.entity.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <strong className="text-foreground">{log.userName}</strong>{" "}
                        <span className="text-muted-foreground">{log.action.toLowerCase()}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded border", ENTITY_COLORS[log.entity] ?? "bg-secondary border-border text-muted-foreground")}>
                          {log.entity}
                        </span>
                        {prev !== null && (
                          <span className="text-xs text-rose-400/80 font-mono truncate max-w-48">
                            {JSON.stringify(prev)}
                          </span>
                        )}
                        {prev !== null && next !== null && <span className="text-xs text-muted-foreground">→</span>}
                        {next !== null && (
                          <span className="text-xs text-emerald-400/80 font-mono truncate max-w-48">
                            {JSON.stringify(next)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0" title={formatDateTime(log.createdAt)}>
                      {timeAgo(log.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
