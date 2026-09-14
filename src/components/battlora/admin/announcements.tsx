"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Megaphone, Plus, X } from "lucide-react";
import { useApiData } from "../data-hooks";
import { ConfirmDialog } from "../shared/copy-field";
import { EmptyState, LoadingRows, PriorityBadge, SectionHeader } from "../shared/kit";
import { api } from "@/lib/api-client";
import { formatDateTime, timeAgo } from "@/lib/format";

type AnnouncementsData = {
  announcements: {
    id: string;
    title: string;
    description: string;
    priority: string;
    publishAt: string;
    expiresAt: string | null;
    tournament: { name: string } | null;
  }[];
};

type TournamentsData = { tournaments: { id: string; name: string }[] };

export function AdminAnnouncements() {
  const { data, loading, refetch } = useApiData<AnnouncementsData>("/api/announcements");
  const { data: tournaments } = useApiData<TournamentsData>("/api/tournaments");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "NORMAL", tournamentId: "global" });

  async function submit() {
    setBusy(true);
    try {
      await api("/api/announcements", {
        json: {
          title: form.title,
          description: form.description,
          priority: form.priority,
          tournamentId: form.tournamentId === "global" ? undefined : form.tournamentId,
        },
      });
      toast({ title: "Announcement published 📢", description: "It is now visible on the site and dashboards." });
      setOpen(false);
      setForm({ title: "", description: "", priority: "NORMAL", tournamentId: "global" });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/announcements/${id}`, { method: "DELETE" });
      toast({ title: "Announcement deleted" });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Announcements"
        subtitle="Platform-wide and tournament-specific announcements (PRD 27)"
        action={
          <Button className="btn-primary-glow" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        }
      />

      {loading ? (
        <LoadingRows count={4} />
      ) : (data?.announcements ?? []).length === 0 ? (
        <EmptyState icon={<Megaphone className="h-10 w-10" />} title="No announcements" description="Publish your first announcement." />
      ) : (
        <div className="space-y-3">
          {data!.announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={a.priority} />
                    <p className="font-medium">{a.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.tournament ? a.tournament.name : "Platform-wide"} · {timeAgo(a.publishAt)}
                    {a.expiresAt && ` · expires ${formatDateTime(a.expiresAt)}`}
                  </p>
                </div>
                <ConfirmDialog
                  trigger={<Button size="sm" variant="ghost" className="text-muted-foreground"><X className="h-4 w-4" /></Button>}
                  title="Delete announcement?"
                  description="It will be removed from the homepage, tournament pages and dashboards."
                  confirmLabel="Delete"
                  onConfirm={() => remove(a.id)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Server maintenance tonight at 2 AM" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={4} placeholder="Full announcement text…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="IMPORTANT">Important</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Scope</Label>
                <Select value={form.tournamentId} onValueChange={(v) => setForm({ ...form, tournamentId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-56">
                    <SelectItem value="global">Platform-wide</SelectItem>
                    {(tournaments?.tournaments ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={submit} disabled={busy || form.title.length < 3 || form.description.length < 10}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Publish Announcement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
