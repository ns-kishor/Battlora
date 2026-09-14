"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, UserCog, Users } from "lucide-react";
import { useApiData } from "../data-hooks";
import { useAuth } from "../auth-context";
import { ConfirmDialog } from "../shared/copy-field";
import { EmptyState, LoadingRows, RoleBadge, SectionHeader, StatusBadge } from "../shared/kit";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { ROLES, ROLE_LABELS } from "@/lib/types";

type UsersData = {
  users: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    createdAt: string;
    teamCaptained: { id: string; name: string } | null;
  }[];
};

export function AdminUsers() {
  const { user: me } = useAuth();
  const { data, loading, refetch } = useApiData<UsersData>("/api/admin/users");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const users = (data?.users ?? []).filter((u) => {
    if (q && !u.name.toLowerCase().includes(q.toLowerCase()) && !u.email.toLowerCase().includes(q.toLowerCase())) return false;
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    return true;
  });

  async function setRole(id: string, role: string) {
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", json: { role } });
      toast({ title: "Role updated", description: `Now ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}.` });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", json: { status } });
      toast({ title: `User ${status.toLowerCase()}`, description: "Active sessions were terminated." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Users & Roles" subtitle="Granular role-based access control (PRD 40)" />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or email…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="ALL">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingRows count={5} />
      ) : users.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="No users found" />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id} className={u.status !== "ACTIVE" ? "opacity-60" : ""}>
              <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary font-display font-bold">
                    {u.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {u.name}
                      {u.teamCaptained && <span className="text-xs text-muted-foreground"> · {u.teamCaptained.name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email} · joined {formatDate(u.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <RoleBadge role={u.role} />
                  <StatusBadge status={u.status} />
                  {me?.role === "SUPER_ADMIN" && u.id !== me?.id ? (
                    <Select value={u.role} onValueChange={(v) => setRole(u.id, v)}>
                      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  {u.id !== me?.id && u.status === "ACTIVE" && (
                    <ConfirmDialog
                      trigger={<Button size="sm" variant="destructive" className="h-8">Ban</Button>}
                      title={`Ban ${u.name}?`}
                      description="The user will be signed out immediately and unable to log in. Teams they captain remain intact."
                      confirmLabel="Ban User"
                      onConfirm={() => setStatus(u.id, "BANNED")}
                    />
                  )}
                  {u.id !== me?.id && u.status !== "ACTIVE" && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setStatus(u.id, "ACTIVE")}>
                      Reactivate
                    </Button>
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
