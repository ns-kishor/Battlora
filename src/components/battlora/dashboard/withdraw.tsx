"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BadgeCheck, Banknote, CircleAlert, HandCoins, Hourglass, Lock, PencilLine, Wallet } from "lucide-react";
import { useApiData } from "../data-hooks";
import {
  EmptyState,
  LoadingRows,
  PositionMedal,
  SectionHeader,
  WithdrawalStatusBadge,
} from "../shared/kit";
import { api } from "@/lib/api-client";
import { formatMoney, timeAgo } from "@/lib/format";
import { WITHDRAWAL_METHODS, WITHDRAWAL_EVENT_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================
// Withdraw Prize Money — dashboard section for eligible 1st/2nd/
// 3rd-place winners of tournaments with finalized results.
// ============================================================

type WithdrawalData = {
  id: string;
  requestNo: string;
  contactPhone: string;
  method: string;
  accountNumber: string;
  status: string;
  adminNote: string | null;
  submittedAt: string;
  paidAt: string | null;
  events: { action: string; status: string; note: string | null; actorName: string; createdAt: string }[];
};

type EligiblePrize = {
  prizeId: string;
  position: number;
  positionLabel: string;
  prizeName: string;
  amount: number;
  tournament: { id: string; name: string };
  status: string;
  withdrawal: WithdrawalData | null;
};

type PendingPodium = {
  tournament: { id: string; name: string };
  position: number;
  positionLabel: string;
  provisionalAmount: number;
  tournamentStatus: string;
  matchesPlayed: number;
  matchesPlanned: number;
};

type WithdrawalsData = {
  team: { id: string; name: string; logoUrl: string | null; contactNumber: string | null } | null;
  eligible: EligiblePrize[];
  pending: PendingPodium[];
  phone: string | null;
};

export function MyWithdrawals() {
  const { data, loading, refetch } = useApiData<WithdrawalsData>("/api/me/withdrawals");
  const [editing, setEditing] = useState<string | null>(null); // prizeId being (re)submitted

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Withdraw Prize Money" />
        <LoadingRows count={3} />
      </div>
    );
  }

  const eligible = data?.eligible ?? [];
  const pending = data?.pending ?? [];

  if (eligible.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Withdraw Prize Money"
          subtitle="Payouts for officially recognized podium finishes."
        />
        {pending.length > 0 ? (
          <PendingPodiumPanel pending={pending} />
        ) : (
          <EmptyState
            icon={<HandCoins className="h-10 w-10" />}
            title="You currently have no eligible prize withdrawals"
            description="Withdrawal requests unlock automatically when your team finishes 1st, 2nd or 3rd in a tournament and the administrator publishes the final results."
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Withdraw Prize Money"
        subtitle="Your officially recognized podium prizes and their payout status."
      />

      {eligible.map((p) => {
        const w = p.withdrawal;
        const showForm =
          editing === p.prizeId || (!w && p.status === "NOT_SUBMITTED") || (w && w.status === "REQUIRES_CORRECTION" && editing === p.prizeId);
        return (
          <Card key={p.prizeId} className="overflow-hidden">
            <CardContent className="p-4 sm:p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-display font-bold text-lg truncate">{p.tournament.name}</h3>
                    <PositionMedal position={p.position} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Final result verified from the official standings · Prize: {p.prizeName}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-display text-2xl font-bold text-primary">
                    {formatMoney(p.amount)}
                  </span>
                  <WithdrawalStatusBadge status={p.status} />
                </div>
              </div>

              {/* Summary (spec §7) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-border bg-secondary/30 p-3.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tournament</p>
                  <p className="font-medium truncate">{p.tournament.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Final Position</p>
                  <p className="font-medium">{p.positionLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prize Amount</p>
                  <p className="font-medium text-primary">{formatMoney(p.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Status</p>
                  <p className="font-medium">
                    {p.status === "PAID" ? "Completed" : p.status === "NOT_SUBMITTED" ? "—" : p.status.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Admin message (spec §4) */}
              {w?.adminNote && (
                <div
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm flex items-start gap-2.5",
                    w.status === "REQUIRES_CORRECTION"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : w.status === "REJECTED"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        : w.status === "PAID"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-border bg-secondary/40 text-muted-foreground"
                  )}
                >
                  {w.status === "REQUIRES_CORRECTION" ? (
                    <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : w.status === "PAID" ? (
                    <BadgeCheck className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <Banknote className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">Message from the administrator</p>
                    <p className="mt-0.5 break-words">{w.adminNote}</p>
                  </div>
                </div>
              )}

              {/* Form or request details */}
              {showForm ? (
                <WithdrawForm
                  prize={p}
                  teamName={data?.team?.name ?? "—"}
                  defaultPhone={
                    w?.contactPhone ?? data?.phone ?? data?.team?.contactNumber ?? ""
                  }
                  existing={w}
                  onCancel={w ? () => setEditing(null) : undefined}
                  onDone={() => {
                    setEditing(null);
                    refetch();
                  }}
                />
              ) : w ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Request No.</p>
                      <p className="font-mono">{w.requestNo}</p>
                    </div>
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
                  </div>

                  {/* Timeline */}
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Request timeline
                    </p>
                    <ol className="space-y-3">
                      {w.events.map((e, i) => (
                        <li key={i} className="flex gap-3 text-sm">
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
                              </p>
                              <p className="text-xs text-muted-foreground shrink-0">
                                {timeAgo(e.createdAt)}
                              </p>
                            </div>
                            {e.note && <p className="text-xs text-muted-foreground mt-0.5 break-words">{e.note}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {w.status === "REQUIRES_CORRECTION" && (
                    <Button onClick={() => setEditing(p.prizeId)} className="w-full sm:w-auto">
                      <PencilLine className="h-4 w-4" /> Resubmit Corrected Information
                    </Button>
                  )}
                  {w.status === "REJECTED" && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      This request is closed. An administrator must reopen it before you can resubmit.
                    </p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      {pending.length > 0 && <PendingPodiumPanel pending={pending} />}

      <p className="text-xs text-muted-foreground">
        Prize withdrawals are available only for officially recognized 1st, 2nd and 3rd-place
        finishes after the administrator publishes the final results. Payouts are processed to the
        mobile wallet you select (bKash, Nagad, Upay or Rocket).
      </p>
    </div>
  );
}

// ---------- Provisional podium (final results not locked yet) ----------

function PendingPodiumPanel({ pending }: { pending: PendingPodium[] }) {
  return (
    <Card className="border-amber-500/25 bg-amber-500/[0.04]">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start gap-2.5">
          <Hourglass className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-display font-bold">Provisional podium — awaiting official results</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Your team is currently in a top-3 position, but the final results for these tournaments
              have not been officially published yet. Your withdrawal form will appear here
              automatically as soon as the administrator locks the final results — no action needed
              from you now. Current standings can still change until then.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {pending.map((p) => (
            <div
              key={p.tournament.id}
              className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-border bg-card/60 px-3.5 py-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PositionMedal position={p.position} />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.tournament.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Currently {p.positionLabel}{" · "}
                    {p.matchesPlayed}/{p.matchesPlanned} matches played
                    {p.tournamentStatus === "ONGOING" ? " · live" : ""}
                  </p>
                </div>
              </div>
              <p className="font-display font-bold text-amber-300 shrink-0">
                {p.provisionalAmount > 0 ? `${formatMoney(p.provisionalAmount)} (provisional)` : "Prize to be confirmed"}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Withdrawal form (submit / resubmit) ----------

function WithdrawForm({
  prize,
  teamName,
  defaultPhone,
  existing,
  onCancel,
  onDone,
}: {
  prize: EligiblePrize;
  teamName: string;
  defaultPhone: string;
  existing: WithdrawalData | null;
  onCancel?: () => void;
  onDone: () => void;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [method, setMethod] = useState(existing?.method ?? "");
  const [account, setAccount] = useState(existing?.accountNumber ?? "");
  const [pending, setPending] = useState(false);

  async function submit() {
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const cleanAccount = account.replace(/[\s-]/g, "");
    if (!/^(\+?880|0)?1\d{9}$/.test(cleanPhone)) {
      toast({ title: "Invalid phone", description: "Enter a valid mobile number, e.g. 01712345678.", variant: "destructive" });
      return;
    }
    if (!method) {
      toast({ title: "Payment method required", description: "Select bKash, Nagad, Upay or Rocket.", variant: "destructive" });
      return;
    }
    if (!/^\d{8,15}$/.test(cleanAccount)) {
      toast({ title: "Invalid account number", description: "Account number must be 8–15 digits (your wallet number).", variant: "destructive" });
      return;
    }

    setPending(true);
    try {
      if (existing) {
        await api(`/api/me/withdrawals/${existing.id}`, {
          method: "PATCH",
          json: { contactPhone: cleanPhone, method, accountNumber: cleanAccount },
        });
        toast({ title: "Withdrawal resubmitted", description: "Your corrected details are Under Review again." });
      } else {
        await api("/api/me/withdrawals", {
          method: "POST",
          json: { prizeId: prize.prizeId, contactPhone: cleanPhone, method, accountNumber: cleanAccount },
        });
        toast({
          title: "Withdrawal request submitted",
          description: "Your request is now Under Review. Track its status here.",
        });
      }
      onDone();
    } catch (e) {
      toast({
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <p className="font-semibold text-sm">
          {existing ? "Resubmit corrected withdrawal details" : "Secure withdrawal form"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Team / Player Name</Label>
          <Input value={teamName} readOnly disabled />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tournament Name</Label>
          <Input value={prize.tournament.name} readOnly disabled />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Position Secured</Label>
          <Input value={prize.positionLabel} readOnly disabled className="font-medium" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Prize Amount</Label>
          <Input value={formatMoney(prize.amount)} readOnly disabled className="text-primary font-semibold" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`phone-${prize.prizeId}`}>Contact Phone Number *</Label>
          <Input
            id={`phone-${prize.prizeId}`}
            placeholder="01712345678"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred Payment Method *</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {WITHDRAWAL_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`account-${prize.prizeId}`}>Account Number (wallet) *</Label>
          <Input
            id={`account-${prize.prizeId}`}
            placeholder="e.g. 01712345678"
            inputMode="numeric"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            The prize money will be transferred to this {method || "wallet"} account after verification.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Submitting…" : existing ? "Resubmit Request" : "Submit Withdrawal Request"}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <p className="text-xs text-muted-foreground sm:ml-auto">
          Fields marked * are required. Status after submission: Under Review.
        </p>
      </div>
    </div>
  );
}
