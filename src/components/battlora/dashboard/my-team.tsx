"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, ImagePlus, Loader2, ShieldCheck, UserPlus, X } from "lucide-react";
import { useApiData } from "../data-hooks";
import { useAuth } from "../auth-context";
import { EmptyState, LoadingRows, SectionHeader, TeamLogo } from "../shared/kit";
import { api } from "@/lib/api-client";
import { compressImage } from "@/lib/format";
import { PLAYER_ROLES } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MyTeam() {
  const { refresh } = useAuth();
  const { data, loading, refetch } = useApiData<{
    team: {
      id: string;
      name: string;
      logoUrl: string | null;
      contactNumber: string | null;
      email: string | null;
      status: string;
      players: { id: string; realName: string; ign: string; uid: string; phone: string | null; role: string; status: string; isSubstitute: boolean; photoUrl: string | null }[];
      registrations: { id: string; regId: string; status: string; tournament: { name: string } }[];
    } | null;
  }>("/api/me/team");

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ name: string; logoUrl: string | null; contactNumber: string; email: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ ign: "", uid: "", realName: "", phone: "", role: "PLAYER", isSubstitute: false });

  if (loading) return <LoadingRows count={3} />;
  const team = data?.team;

  if (!team) {
    return (
      <EmptyState
        icon={<UserPlus className="h-10 w-10" />}
        title="No team yet"
        description="Create your team by registering for a tournament."
      />
    );
  }

  const startEdit = () => {
    setForm({
      name: team!.name,
      logoUrl: team!.logoUrl,
      contactNumber: team!.contactNumber ?? "",
      email: team!.email ?? "",
    });
    setEditing(true);
  };

  async function saveTeam() {
    if (!form) return;
    setBusy(true);
    try {
      await api("/api/me/team", { method: "PATCH", json: form });
      toast({ title: "Team updated", description: "Your team information has been saved." });
      setEditing(false);
      refetch();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function addPlayer() {
    setBusy(true);
    try {
      await api("/api/me/players", { json: newPlayer });
      toast({ title: "Player added", description: `${newPlayer.ign} joined your roster.` });
      setAddOpen(false);
      setNewPlayer({ ign: "", uid: "", realName: "", phone: "", role: "PLAYER", isSubstitute: false });
      refetch();
    } catch (e) {
      toast({ title: "Could not add player", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function removePlayer(id: string, ign: string) {
    setBusy(true);
    try {
      await api(`/api/me/players?id=${id}`, { method: "DELETE" });
      toast({ title: "Player removed", description: `${ign} was removed from your roster.` });
      refetch();
    } catch (e) {
      toast({ title: "Could not remove player", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const mainPlayers = team.players.filter((p) => !p.isSubstitute);
  const substitute = team.players.filter((p) => p.isSubstitute);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="My Team"
        subtitle="Manage your team identity and roster"
        action={
          editing ? undefined : (
            <Button variant="outline" onClick={startEdit}>
              Edit Team Info
            </Button>
          )
        }
      />

      {/* Team info card */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          {editing && form ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Team Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Number</Label>
                  <Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Team Logo</Label>
                <div className="flex items-center gap-3">
                  {form.logoUrl && (
                    <>
                      { }
                      <img src={form.logoUrl} alt="Team logo" className="h-16 w-16 rounded-lg border border-border object-cover" />
                      <Button variant="outline" size="sm" onClick={() => setForm({ ...form, logoUrl: null })}>
                        <X className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </>
                  )}
                  <label className={cn(
                    "cursor-pointer rounded-lg border border-dashed border-border hover:border-primary/50 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2 transition-colors",
                    form.logoUrl && "hidden"
                  )}>
                    <ImagePlus className="h-4 w-4" /> Upload logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) setForm({ ...form, logoUrl: await compressImage(f, 300, 0.72) });
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveTeam} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save Changes
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <TeamLogo name={team.name} logoUrl={team.logoUrl} size={72} />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-display text-2xl font-bold truncate">{team.name}</h2>
                  <Badge variant="outline" className={cn(
                    team.status === "VERIFIED" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                    team.status === "PENDING" && "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  )}>
                    <ShieldCheck className="h-3 w-3" /> {team.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{team.contactNumber ?? "No contact number"} · {team.email ?? "No email"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster */}
      <SectionHeader
        title={`Roster (${mainPlayers.length} players${substitute.length ? " + 1 sub" : ""})`}
        subtitle="Roster changes after registration closes require admin approval"
        action={
          <Button onClick={() => setAddOpen(!addOpen)} variant={addOpen ? "outline" : "default"}>
            <UserPlus className="h-4 w-4" /> {addOpen ? "Cancel" : "Add Player"}
          </Button>
        }
      />

      {addOpen && (
        <Card className="border-primary/25">
          <CardContent className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>IGN *</Label>
                <Input placeholder="In-game name" value={newPlayer.ign} onChange={(e) => setNewPlayer({ ...newPlayer, ign: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Free Fire UID *</Label>
                <Input placeholder="6–12 digits" inputMode="numeric" value={newPlayer.uid} onChange={(e) => setNewPlayer({ ...newPlayer, uid: e.target.value.replace(/\D/g, "") })} />
              </div>
              <div className="space-y-1.5">
                <Label>Real Name</Label>
                <Input value={newPlayer.realName} onChange={(e) => setNewPlayer({ ...newPlayer, realName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={newPlayer.role}
                  onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                >
                  {PLAYER_ROLES.map((r) => (
                    <option key={r} value={r} className="bg-popover">{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={newPlayer.isSubstitute}
                onChange={(e) => setNewPlayer({ ...newPlayer, isSubstitute: e.target.checked })}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Register as substitute player
            </label>
            <Button onClick={addPlayer} disabled={busy || !newPlayer.ign || newPlayer.uid.length < 6}>
              {busy ? "Adding…" : "Add to Roster"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {[...mainPlayers, ...substitute].map((p) => (
          <Card key={p.id} className="card-hover">
            <CardContent className="p-4 flex items-center gap-4">
              <TeamLogo name={p.ign} logoUrl={p.photoUrl} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{p.ign}</p>
                  {p.isSubstitute && (
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30 text-[10px]">
                      SUB
                    </Badge>
                  )}
                  {p.role !== "PLAYER" && p.role !== "SUBSTITUTE" && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-[10px]">
                      {p.role}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">UID {p.uid}</p>
                <p className="text-xs text-muted-foreground truncate">{p.realName}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removePlayer(p.id, p.ign)}
                aria-label={`Remove ${p.ign}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
