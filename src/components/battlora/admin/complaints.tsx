"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Gavel } from "lucide-react";
import { useApiData } from "../data-hooks";
import {
  ComplaintStatusBadge,
  ComplaintTypeBadge,
  EmptyState,
  LoadingRows,
  SectionHeader,
} from "../shared/kit";
import { api } from "@/lib/api-client";
import { formatDateTime, timeAgo } from "@/lib/format";

type ComplaintsData = {
  complaints: {
    id: string;
    ticketId: string;
    type: string;
    description: string;
    status: string;
    internalNotes: string | null;
    createdAt: string;
    team: { name: string };
    tournament: { name: string };
    submitter: { name: string };
    evidence: { id: string; url: string; name: string | null }[];
  }[];
};

export function AdminComplaints() {
  const { data, loading, refetch } = useApiData<ComplaintsData>("/api/complaints");
  const [status, setStatus] = useState("PENDING");
  const [viewer, setViewer] = useState<string | null>(null);

  const complaints = (data?.complaints ?? []).filter((c) => status === "ALL" || c.status === status);

  async function update(id: string, newStatus: string) {
    try {
      await api(`/api/complaints/${id}`, { method: "PATCH", json: { status: newStatus } });
      toast({ title: `Case ${newStatus.replace(/_/g, " ").toLowerCase()}`, description: "The team has been notified." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  async function saveNotes(id: string, notes: string) {
    try {
      await api(`/api/complaints/${id}`, { method: "PATCH", json: { internalNotes: notes } });
      toast({ title: "Internal notes saved" });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Complaints" subtitle="Protest review queue with evidence management" />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {["PENDING", "UNDER_REVIEW", "CONFIRMED", "REJECTED", "RESOLVED", "ALL"].map((s) => (
            <SelectItem key={s} value={s}>{s === "ALL" ? "All cases" : s.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <LoadingRows count={4} />
      ) : complaints.length === 0 ? (
        <EmptyState icon={<Gavel className="h-10 w-10" />} title="No complaints" description="Cases submitted by team captains will appear here." />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm text-primary">{c.ticketId}</span>
                    <ComplaintTypeBadge type={c.type} />
                    <span className="text-xs text-muted-foreground">{c.team.name} · {c.tournament.name}</span>
                  </div>
                  <ComplaintStatusBadge status={c.status} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                {c.evidence.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {c.evidence.map((e) => (
                       
                      <img key={e.id} src={e.url} alt={e.name ?? "evidence"} className="h-20 rounded-lg border border-border object-cover cursor-pointer hover:border-primary/40" onClick={() => setViewer(e.url)} />
                    ))}
                  </div>
                )}
                {c.internalNotes && (
                  <p className="text-xs rounded-lg bg-secondary/60 border border-border px-3 py-2 text-muted-foreground">
                    📝 Internal: {c.internalNotes}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap border-t border-border pt-3">
                  {c.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => update(c.id, "UNDER_REVIEW")}>Start Review</Button>}
                  {["PENDING", "UNDER_REVIEW"].includes(c.status) && (
                    <>
                      <Button size="sm" onClick={() => update(c.id, "CONFIRMED")}>Confirm Violation</Button>
                      <Button size="sm" variant="outline" onClick={() => update(c.id, "REJECTED")}>Reject</Button>
                    </>
                  )}
                  {c.status === "CONFIRMED" && <Button size="sm" onClick={() => update(c.id, "RESOLVED")}>Mark Resolved</Button>}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => {
                      const notes = window.prompt("Internal notes (admins only):", c.internalNotes ?? "");
                      if (notes !== null) saveNotes(c.id, notes);
                    }}
                  >
                    Notes
                  </Button>
                  <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="bg-popover border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Evidence</DialogTitle>
          </DialogHeader>
          { }
          {viewer && <img src={viewer} alt="Evidence" className="w-full rounded-lg border border-border" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
