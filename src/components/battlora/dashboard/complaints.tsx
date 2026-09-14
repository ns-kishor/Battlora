"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ImagePlus, Loader2, MessageSquareWarning, Paperclip, Plus, X } from "lucide-react";
import { useApiData } from "../data-hooks";
import {
  ComplaintStatusBadge,
  ComplaintTypeBadge,
  EmptyState,
  LoadingRows,
  SectionHeader,
} from "../shared/kit";
import { api } from "@/lib/api-client";
import { compressImage, formatDateTime, timeAgo } from "@/lib/format";
import { COMPLAINT_TYPES } from "@/lib/types";

type ComplaintData = {
  complaints: {
    id: string;
    ticketId: string;
    type: string;
    description: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
    matchId: string | null;
    tournament: { id: string; name: string };
    evidence: { id: string; url: string; name: string | null }[];
  }[];
};

type MatchOption = {
  matches: {
    id: string;
    matchNumber: number;
    map: string;
    resultPublished: boolean;
  }[];
  activeTournamentId: string | null;
  standings: { tournament: { name: string } } | null;
};

export function MyComplaints() {
  const { data, loading, refetch } = useApiData<ComplaintData>("/api/complaints?mine=1");
  const { data: dash } = useApiData<MatchOption>("/api/me/dashboard");

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ matchId: "", type: "", description: "" });
  const [evidence, setEvidence] = useState<{ url: string; name: string }[]>([]);

  async function submit() {
    setBusy(true);
    try {
      const res = await api<{ complaint: { ticketId: string } }>("/api/complaints", {
        json: {
          tournamentId: dash?.activeTournamentId,
          matchId: form.matchId || undefined,
          type: form.type,
          description: form.description,
          evidence,
        },
      });
      toast({
        title: "Complaint submitted",
        description: `Ticket ${res.complaint.ticketId} created. Admins will review your evidence.`,
      });
      setOpen(false);
      setForm({ matchId: "", type: "", description: "" });
      setEvidence([]);
      refetch();
    } catch (e) {
      toast({
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !!dash?.activeTournamentId && form.type && form.description.length >= 20;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Complaints & Protests"
        subtitle="Report rule violations with evidence — every case is tracked"
        action={
          dash?.activeTournamentId ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary-glow">
                  <Plus className="h-4 w-4" /> Submit Complaint
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Submit a Complaint</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Match (optional)</Label>
                    <Select value={form.matchId || "none"} onValueChange={(v) => setForm({ ...form, matchId: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select match" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="none">Not match-specific</SelectItem>
                        {(dash?.matches ?? []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            Match #{String(m.matchNumber).padStart(2, "0")} · {m.map}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Complaint Type *</Label>
                    <Select value={form.type || undefined} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {COMPLAINT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description * (min 20 characters)</Label>
                    <Textarea
                      placeholder="Describe what happened — include timestamps, player names and any relevant details…"
                      rows={5}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Evidence (images — up to 4)</Label>
                    <div className="flex flex-wrap gap-2">
                      {evidence.map((e, i) => (
                        <div key={i} className="relative">
                          { }
                          <img src={e.url} alt={e.name ?? "evidence"} className="h-16 w-16 rounded-lg border border-border object-cover" />
                          <button
                            className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-white"
                            onClick={() => setEvidence(evidence.filter((_, idx) => idx !== i))}
                            aria-label="Remove evidence"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {evidence.length < 4 && (
                        <label className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer text-muted-foreground">
                          <ImagePlus className="h-5 w-5" />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (ev) => {
                              const f = ev.target.files?.[0];
                              if (f) {
                                const url = await compressImage(f, 900, 0.68);
                                setEvidence((prev) => [...prev, { url, name: f.name }]);
                              }
                              ev.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> Screenshots and gameplay clips strengthen your case.
                    </p>
                  </div>

                  <Button className="w-full" disabled={!canSubmit || busy} onClick={submit}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Complaint"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingRows count={3} />
      ) : (data?.complaints ?? []).length === 0 ? (
        <EmptyState
          icon={<MessageSquareWarning className="h-10 w-10" />}
          title="No complaints submitted"
          description="If you experience cheating, teaming or wrong results, submit a protest with evidence here."
        />
      ) : (
        <div className="space-y-3">
          {data!.complaints.map((c) => (
            <Card key={c.id} className="card-hover">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm text-primary">{c.ticketId}</span>
                    <ComplaintTypeBadge type={c.type} />
                  </div>
                  <ComplaintStatusBadge status={c.status} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                {c.evidence.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {c.evidence.map((e) => (
                       
                      <img key={e.id} src={e.url} alt={e.name ?? "evidence"} className="h-20 rounded-lg border border-border object-cover" />
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                  <span>{c.tournament.name}</span>
                  <span title={formatDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
