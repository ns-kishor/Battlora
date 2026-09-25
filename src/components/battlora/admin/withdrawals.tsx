"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  HandCoins,
  Lock,
  RefreshCcw,
  Search,
  Send,
  StickyNote,
  Wallet,
  X,
} from "lucide-react";
import { useApiData } from "../data-hooks";
import {
  EmptyState,
  LoadingRows,
  PositionMedal,
  SectionHeader,
  TeamLogo,
  WithdrawalStatusBadge,
} from "../shared/kit";
import { api } from "@/lib/api-client";
import { formatMoney, timeAgo } from "@/lib/format";
import {
  WITHDRAWAL_METHODS,
  WITHDRAWAL_STATUSES,
  WITHDRAWAL_STATUS_LABELS,
  WITHDRAWAL_EVENT_LABELS,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================
// Admin — Prize Withdrawals management (verification + payout)
// ============================================================

type AdminWithdrawal = {
  id: string;
  requestNo: string;
  position: number;
  prizeName: string;
  amount: number;
  contactPhone: string;
  method: string;
  accountNumber: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  reviewedAt: string | null;
  tournament: { id: string; name: string };
  team: { id: string; name: string; logoUrl: string | null };
  submittedBy: { id: string; name: string };
  events: {
    id: string;
    action: string;
    status: string;
    note: string | null;
    internal: boolean;
    actorName: string;
    createdAt: string;
  }[];
};

type AdminData = {
  withdrawals: AdminWithdrawal[];
  tournaments: { id: string; name: string }[];
  stats: {
    total: number;
    underReview: number;
    approved: number;
    processing: number;
    paid: number;
    rejected: number;
    correction: number;
    totalPaidAmount: string;
  };
};

type ActionKind =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CORRECTION"
  | "MARK_PROCESSING"
  | "MARK_PAID"
  | "REOPEN"
  | "NOTE";

const ACTION_META: Record<
  ActionKind,
  { title: string; label: string; noteRequired: boolean; noteLabel: string; tone: "primary" | "danger" | "warn" }
> = {
  APPROVE: {
    title: "Approve withdrawal request",
    label: "Approve",
    noteRequired: false,
    noteLabel: "Note to the winner (optional)",
    tone: "primary",
  },
  REJECT: {
    title: "Reject withdrawal request",
    label: "Reject",
    noteRequired: true,
    noteLabel: "Rejection reason (required — shown to the winner)",
    tone: "danger",
  },
  REQUEST_CORRECTION: {
    title: "Request corrected information",
    label: "Request Correction",
    noteRequired: true,
    noteLabel: "What must be corrected? (required — shown to the winner)",
    tone: "warn",
  },
  MARK_PROCESSING: {
    title: "Mark payment as processing",
    label: "Mark Processing",
    noteRequired: false,
    noteLabel: "Note to the winner (optional)",
    tone: "primary",
  },
  MARK_PAID: {
    title: "Mark prize payment as completed",
    label: "Mark Paid",
    noteRequired: false,
    noteLabel: "Payment confirmation note (optional — shown to the winner)",
    tone: "primary",
  },
  REOPEN: {
    title: "Reopen for resubmission",
    label: "Reopen for Resubmission",
    noteRequired: false,
    noteLabel: "Instructions for the winner (optional)",
    tone: "warn",
  },
  NOTE: {
    title: "Add internal note",
    label: "Add Internal Note",
    noteRequired: true,
    noteLabel: "Internal note (admins only — never shown to the winner)",
    tone: "warn",
  },
};

export function AdminWithdrawals() {
  const { data, loading, refetch } = useApiData<AdminData>("/api/admin/withdrawals");
  const [tournamentId, setTournamentId] = useState("ALL");
  const [position, setPosition] = useState("ALL");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [action, setAction] = useState<{ kind: ActionKind; w: AdminWithdrawal } | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const withdrawals = data?.withdrawals ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return withdrawals.filter((w) => {
      if (tournamentId !== "ALL" && w.tournament.id !== tournamentId) return false;
      if (position !== "ALL" && String(w.position) !== position) return false;
      if (method !== "ALL" && w.method !== method) return false;
      if (status !== "ALL" && w.status !== status) return false;
      if (
        needle &&
        !w.requestNo.toLowerCase().includes(needle) &&
        !w.team.name.toLowerCase().includes(needle) &&
        !w.tournament.name.toLowerCase().includes(needle) &&
        !w.accountNumber.includes(needle) &&
        !w.contactPhone.includes(needle) &&
        !w.submittedBy.name.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
  }, [withdrawals, tournamentId, position, method, status, q]);

  const detail = withdrawals.find((w) => w.id === detailId) ?? null;

  async function runAction() {
    if (!action) return;
    const meta = ACTION_META[action.kind];
    if (meta.noteRequired && !note.trim()) {
      toast({ title: "Note required", description: "This action requires a note or reason.", variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      await api(`/api/admin/withdrawals/${action.w.id}`, {
        method: "PATCH",
        json: { action: action.kind, note: note.trim() || undefined },
      });
      toast({
        title: `Request ${action.w.requestNo} updated`,
        description: `Action applied: ${meta.label}.${action.w.team ? " The winner has been notified where applicable." : ""}`,
      });
      setAction(null);
      setNote("");
      refetch();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  function openAction(kind: ActionKind, w: AdminWithdrawal) {
    setNote("");
    setAction({ kind, w });
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Prize Withdrawals"
        subtitle={
          stats
            ? `${stats.total} request${stats.total === 1 ? "" : "s"} · ${stats.underReview} under review · ${stats.paid} paid (${stats.totalPaidAmount})`
            : "Verification and payout of tournament prize winnings."
        }
      />

      {/* Status quick filters (stats) */}
      {stats && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {[
            { value: "ALL", label: `All (${stats.total})` },
            { value: "UNDER_REVIEW", label: `Under Review (${stats.underReview})` },
            { value: "APPROVED", label: `Approved (${stats.approved})` },
            { value: "PAYMENT_PROCESSING", label: `Processing (${stats.processing})` },
            { value: "PAID", label: `Paid (${stats.paid})` },
            { value: "REQUIRES_CORRECTION", label: `Correction (${stats.correction})` },
            { value: "REJECTED", label: `Rejected (${stats.rejected})` },
          ].map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={status === s.value ? "default" : "outline"}
              className={cn("rounded-full whitespace-nowrap shrink-0", status === s.value && "btn-primary-glow")}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={tournamentId} onValueChange={setTournamentId}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="ALL">All tournaments</SelectItem>
            {(data?.tournaments ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={position} onValueChange={setPosition}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="ALL">All positions</SelectItem>
            <SelectItem value="1">🥇 1st Place</SelectItem>
            <SelectItem value="2">🥈 2nd Place</SelectItem>
            <SelectItem value="3">🥉 3rd Place</SelectItem>
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="ALL">All methods</SelectItem>
            {WITHDRAWAL_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="ALL">All statuses</SelectItem>
            {WITHDRAWAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{WITHDRAWAL_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search request, team, account…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <LoadingRows count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-10 w-10" />}
          title="No withdrawal requests"
          description={
            withdrawals.length === 0
              ? "Requests appear here when eligible 1st/2nd/3rd-place winners submit their payout details."
              : "No requests match the current filters."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamLogo name={w.team.name} logoUrl={w.team.logoUrl} size={40} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{w.team.name}</p>
                        <PositionMedal position={w.position} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {w.tournament.name} · <span className="font-mono">{w.requestNo}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display font-bold text-primary">{formatMoney(w.amount)}</span>
                    <WithdrawalStatusBadge status={w.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{w.method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p className="font-mono">{w.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Phone</p>
                    <p className="font-mono">{w.contactPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted By</p>
                    <p className="font-medium truncate">{w.submittedBy.name}</p>
                  </div>
                </div>

                {w.adminNote && (
                  <p className={cn(
                    "text-xs rounded-lg border px-3 py-2",
                    w.status === "REQUIRES_CORRECTION" || w.status === "REJECTED"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-border bg-secondary/40 text-muted-foreground"
                  )}>
                    Admin message: {w.adminNote}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap border-t border-border pt-3">
                  <Button size="sm" variant="outline" onClick={() => setDetailId(w.id)}>
                    View Details &amp; Actions
                  </Button>
                  {w.status === "UNDER_REVIEW" && (
                    <Button size="sm" onClick={() => openAction("APPROVE", w)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                  )}
                  {w.status === "APPROVED" && (
                    <Button size="sm" onClick={() => openAction("MARK_PROCESSING", w)}>
                      <Wallet className="h-3.5 w-3.5" /> Mark Processing
                    </Button>
                  )}
                  {(w.status === "APPROVED" || w.status === "PAYMENT_PROCESSING") && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-600/90" onClick={() => openAction("MARK_PAID", w)}>
                      <Send className="h-3.5 w-3.5" /> Mark Paid
                    </Button>
                  )}
                  {w.status === "REJECTED" && (
                    <Button size="sm" variant="outline" onClick={() => openAction("REOPEN", w)}>
                      <RefreshCcw className="h-3.5 w-3.5" /> Reopen for Resubmission
                    </Button>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{timeAgo(w.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent aria-describedby={undefined} className="bg-popover border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2.5 flex-wrap">
                  Withdrawal {detail.requestNo}
                  <WithdrawalStatusBadge status={detail.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-3">
                <TeamLogo name={detail.team.name} logoUrl={detail.team.logoUrl} size={44} />
                <div>
                  <p className="font-medium">{detail.team.name}</p>
                  <p className="text-xs text-muted-foreground">{detail.tournament.name}</p>
                </div>
                <div className="ml-auto text-right">
                  <PositionMedal position={detail.position} />
                  <p className="font-display font-bold text-primary text-lg mt-1">{formatMoney(detail.amount)}</p>
                </div>
              </div>

              {/* Eligibility verification */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-start gap-2.5">
                <BadgeCheck className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Eligibility verified</p>
                  <p className="text-xs mt-0.5">
                    {detail.team.name} is the officially recorded {detail.prizeName} winner of{" "}
                    {detail.tournament.name} from the finalized tournament result.
                  </p>
                </div>
              </div>

              {/* Submitted payment details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm rounded-xl border border-border p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{detail.method}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="font-mono">{detail.accountNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contact Phone</p>
                  <p className="font-mono">{detail.contactPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted By</p>
                  <p className="font-medium">{detail.submittedBy.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">{timeAgo(detail.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-medium">{detail.paidAt ? timeAgo(detail.paidAt) : "—"}</p>
                </div>
              </div>

              {detail.adminNote && (
                <p className="text-sm rounded-lg border border-border bg-secondary/40 px-4 py-3 text-muted-foreground">
                  <span className="font-semibold text-foreground">Admin message to winner:</span>{" "}
                  {detail.adminNote}
                </p>
              )}

              {/* Timeline / payment history */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Payment history
                </p>
                <ol className="space-y-3">
                  {detail.events.map((e) => (
                    <li key={e.id} className="flex gap-3 text-sm">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 rounded-full shrink-0",
                          e.status === "PAID"
                            ? "bg-emerald-400"
                            : e.status === "REJECTED"
                              ? "bg-rose-400"
                              : e.status === "REQUIRES_CORRECTION"
                                ? "bg-amber-400"
                                : "bg-primary"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <p className="font-medium">
                            {WITHDRAWAL_EVENT_LABELS[e.action] ?? e.action}
                            {e.internal && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-amber-400">
                                <Lock className="h-3 w-3" /> internal
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground shrink-0">
                            {e.actorName} · {timeAgo(e.createdAt)}
                          </p>
                        </div>
                        {e.note && <p className="text-xs text-muted-foreground mt-0.5 break-words">{e.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap border-t border-border pt-4">
                {detail.status === "UNDER_REVIEW" && (
                  <>
                    <Button size="sm" onClick={() => openAction("APPROVE", detail)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10" onClick={() => openAction("REQUEST_CORRECTION", detail)}>
                      <CircleAlert className="h-3.5 w-3.5" /> Request Correction
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openAction("REJECT", detail)}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                {detail.status === "APPROVED" && (
                  <>
                    <Button size="sm" onClick={() => openAction("MARK_PROCESSING", detail)}>
                      <Wallet className="h-3.5 w-3.5" /> Mark Processing
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-600/90" onClick={() => openAction("MARK_PAID", detail)}>
                      <Send className="h-3.5 w-3.5" /> Mark Paid
                    </Button>
                    <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10" onClick={() => openAction("REQUEST_CORRECTION", detail)}>
                      <CircleAlert className="h-3.5 w-3.5" /> Request Correction
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openAction("REJECT", detail)}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                {detail.status === "PAYMENT_PROCESSING" && (
                  <>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-600/90" onClick={() => openAction("MARK_PAID", detail)}>
                      <Send className="h-3.5 w-3.5" /> Mark Paid
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openAction("REJECT", detail)}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                {detail.status === "REJECTED" && (
                  <Button size="sm" variant="outline" onClick={() => openAction("REOPEN", detail)}>
                    <RefreshCcw className="h-3.5 w-3.5" /> Reopen for Resubmission
                  </Button>
                )}
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => openAction("NOTE", detail)}>
                  <StickyNote className="h-3.5 w-3.5" /> Internal Note
                </Button>
              </div>
              {detail.status === "PAID" && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5" /> This request is completed — the prize money has been paid.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action dialog */}
      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent aria-describedby={undefined} className="bg-popover border-border sm:max-w-md">
          {action && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="font-display">{ACTION_META[action.kind].title}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {action.w.requestNo} · {action.w.team.name} · {formatMoney(action.w.amount)} via{" "}
                {action.w.method} to <span className="font-mono">{action.w.accountNumber}</span>
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="action-note">{ACTION_META[action.kind].noteLabel}</Label>
                <Textarea
                  id="action-note"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    action.kind === "REJECT"
                      ? "e.g. The account number does not match a verified bKash wallet."
                      : action.kind === "REQUEST_CORRECTION"
                        ? "e.g. Please provide the account number registered under your team captain's name."
                        : action.kind === "MARK_PAID"
                          ? "e.g. Transferred via bKash, TrxID 9F2K8L1M."
                          : "Optional note…"
                  }
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={() => setAction(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button
                  variant={ACTION_META[action.kind].tone === "danger" ? "destructive" : "default"}
                  onClick={runAction}
                  disabled={pending}
                >
                  {pending ? "Applying…" : ACTION_META[action.kind].label}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
