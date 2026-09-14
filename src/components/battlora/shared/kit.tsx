"use client";

import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, getInitialsColor } from "@/lib/format";
import {
  TOURNAMENT_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  MATCH_STATUS_LABELS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
  PENALTY_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIZE_STATUS_LABELS,
  TEAM_STATUS_LABELS,
  ROLE_LABELS,
} from "@/lib/types";

// ---------- Brand ----------

export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];
  const icon = { sm: 18, md: 22, lg: 32 }[size];
  return (
    <span className={cn("font-display font-bold tracking-wide flex items-center gap-2", dims)}>
      <span className="grid place-items-center rounded-lg bg-primary/15 border border-primary/30 p-1">
        <Crosshair className="text-primary" size={icon} strokeWidth={2.5} />
      </span>
      <span className="text-foreground">
        BATTLE<span className="text-primary">ORA</span>
      </span>
    </span>
  );
}

// ---------- Status badges ----------

const STATUS_STYLES: Record<string, string> = {
  // generic
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  VERIFIED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  REJECTED: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  BANNED: "bg-rose-600/20 text-rose-400 border-rose-600/40",
  SUSPENDED: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  CANCELLED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  REFUNDED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  DRAFT: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PAID: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  // registration
  SUBMITTED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  PAYMENT_PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  UNDER_REVIEW: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  // tournament
  REGISTRATION_OPEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  REGISTRATION_CLOSED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  UPCOMING: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  ONGOING: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  // match
  SCHEDULED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  ROOM_OPEN: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  LIVE: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  POSTPONED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  // complaint
  CONFIRMED: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  // priority
  NORMAL: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  IMPORTANT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  URGENT: "bg-rose-500/20 text-rose-400 border-rose-500/40",
};

export function StatusBadge({
  status,
  labels,
  pulse,
  className,
}: {
  status: string;
  labels?: Record<string, string>;
  pulse?: boolean;
  className?: string;
}) {
  const label =
    labels?.[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1.5",
        STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30",
        pulse && status === "LIVE" && "live-dot",
        className
      )}
    >
      {label}
    </Badge>
  );
}

export function TournamentStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} labels={TOURNAMENT_STATUS_LABELS} pulse />;
}
export function RegistrationStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} labels={REGISTRATION_STATUS_LABELS} />;
}
export function PaymentStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} labels={PAYMENT_STATUS_LABELS} />;
}
export function MatchStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} labels={MATCH_STATUS_LABELS} pulse />;
}
export function ComplaintStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} labels={COMPLAINT_STATUS_LABELS} />;
}
export function PriorityBadge({ priority }: { priority: string }) {
  return <StatusBadge status={priority} labels={PRIORITY_LABELS} />;
}
export function PrizeStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} labels={PRIZE_STATUS_LABELS} />;
}
export function TeamStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} labels={TEAM_STATUS_LABELS} />;
}
export function ComplaintTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="border-border bg-secondary text-secondary-foreground">
      {COMPLAINT_TYPE_LABELS[type as keyof typeof COMPLAINT_TYPE_LABELS] ?? type}
    </Badge>
  );
}
export function PenaltyTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="border-border bg-secondary text-secondary-foreground">
      {PENALTY_TYPE_LABELS[type as keyof typeof PENALTY_TYPE_LABELS] ?? type}
    </Badge>
  );
}
export function RoleBadge({ role }: { role: string }) {
  const isSuper = role === "SUPER_ADMIN";
  const isAdmin = role === "TOURNAMENT_ADMIN";
  return (
    <Badge
      variant="outline"
      className={cn(
        isSuper && "bg-primary/15 text-primary border-primary/30",
        isAdmin && "bg-amber-500/15 text-amber-400 border-amber-500/30",
        !isSuper && !isAdmin && "bg-secondary text-secondary-foreground border-border"
      )}
    >
      {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
    </Badge>
  );
}

// ---------- Stat cards ----------

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = "primary",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const accents = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    danger: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    muted: "text-muted-foreground bg-secondary border-border",
  }[accent];
  return (
    <Card className="card-hover relative overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </p>
            <p className="font-display text-2xl sm:text-3xl font-bold mt-1.5 truncate">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
          {icon && (
            <span className={cn("shrink-0 grid place-items-center rounded-lg border p-2", accents)}>
              {icon}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Empty / loading states (PRD 55) ----------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 py-12 px-6 text-center">
      {icon && <div className="text-muted-foreground mb-3">{icon}</div>}
      <h3 className="font-display font-semibold text-lg">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ---------- Team logo ----------

export function TeamLogo({
  name,
  logoUrl,
  size = 40,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
       
      <img
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        className={cn("rounded-lg object-cover border border-border", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={`${name} logo`}
      className={cn(
        "grid place-items-center rounded-lg border border-border font-display font-bold",
        className
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${getInitialsColor(name)}33, ${getInitialsColor(name)}11)`,
        color: getInitialsColor(name),
        fontSize: size * 0.38,
      }}
    >
      {initials(name)}
    </span>
  );
}

// ---------- Section header ----------

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold slash-accent">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- Error banner ----------

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      {message}
    </div>
  );
}

// ---------- Rank medal ----------

export function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-gradient-to-br from-amber-300 to-amber-600 text-black border-amber-400/50"
      : rank === 2
        ? "bg-gradient-to-br from-slate-200 to-slate-400 text-black border-slate-300/50"
        : rank === 3
          ? "bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-500/50"
          : "bg-secondary text-secondary-foreground border-border";
  return (
    <span
      className={cn(
        "grid place-items-center rounded-lg border font-display font-bold min-w-9 h-9",
        styles,
        rank > 3 && "text-sm"
      )}
    >
      {rank > 3 ? `#${rank}` : rank}
    </span>
  );
}

// ---------- Back link ----------

export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="text-muted-foreground -ml-2">
      <span aria-hidden>←</span> {label}
    </Button>
  );
}
