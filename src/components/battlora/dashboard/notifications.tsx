"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck } from "lucide-react";
import { useApiData } from "../data-hooks";
import { useAuth } from "../auth-context";
import { EmptyState, LoadingRows, SectionHeader } from "../shared/kit";
import { api } from "@/lib/api-client";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  REGISTRATION: "📋",
  PAYMENT: "💳",
  MATCH: "⚔️",
  ROOM: "🔑",
  RESULT: "🏆",
  COMPLAINT: "⚖️",
  PENALTY: "⚠️",
  ANNOUNCEMENT: "📢",
};

export function MyNotifications() {
  const { refresh } = useAuth();
  const { data, loading, refetch } = useApiData<{
    notifications: { id: string; title: string; message: string; read: boolean; type: string; createdAt: string; link: string | null }[];
    unread: number;
  }>("/api/notifications");

  async function markAll() {
    await api("/api/notifications", { method: "PATCH", json: { all: true } });
    refetch();
    refresh();
  }

  async function markOne(id: string) {
    await api("/api/notifications", { method: "PATCH", json: { id } });
    refetch();
    refresh();
  }

  if (loading) return <LoadingRows count={4} />;

  const notifications = data?.notifications ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notifications"
        subtitle={`${data?.unread ?? 0} unread`}
        action={
          (data?.unread ?? 0) > 0 ? (
            <Button variant="outline" onClick={markAll}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="No notifications"
          description="Registration updates, match reminders, room releases and results will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && markOne(n.id)}
              className={cn(
                "w-full text-left rounded-xl border p-4 transition-colors cursor-pointer",
                n.read
                  ? "border-border bg-card/40 opacity-70"
                  : "border-primary/25 bg-primary/5 hover:border-primary/40"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0" aria-hidden>
                  {TYPE_ICONS[n.type] ?? "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{n.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0" title={formatDateTime(n.createdAt)}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  {!n.read && <span className="inline-block mt-1.5 text-[10px] font-bold text-primary">● NEW</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
