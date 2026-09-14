"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Coins, CreditCard, Receipt, Search, X } from "lucide-react";
import { useApiData } from "../data-hooks";
import {
  EmptyState,
  LoadingRows,
  PaymentStatusBadge,
  SectionHeader,
  TeamLogo,
} from "../shared/kit";
import { api } from "@/lib/api-client";
import { formatMoney, timeAgo } from "@/lib/format";

type PaymentsData = {
  payments: {
    id: string;
    method: string;
    transactionId: string;
    senderNumber: string;
    screenshotUrl: string | null;
    amount: number;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
    registration: {
      regId: string;
      team: { id: string; name: string; logoUrl: string | null };
      tournament: { id: string; name: string };
    };
  }[];
};

export function AdminPayments() {
  const { data, loading, refetch } = useApiData<PaymentsData>("/api/payments");
  const [status, setStatus] = useState("PENDING");
  const [q, setQ] = useState("");
  const [viewer, setViewer] = useState<string | null>(null);

  const payments = (data?.payments ?? []).filter((p) => {
    if (status !== "ALL" && p.status !== status) return false;
    if (q && !p.transactionId.includes(q) && !p.registration.regId.includes(q) && !p.registration.team.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function act(id: string, newStatus: string, rejectionReason?: string) {
    try {
      await api(`/api/payments/${id}`, { method: "PATCH", json: { status: newStatus, rejectionReason } });
      toast({ title: `Payment ${newStatus.toLowerCase()}`, description: "The team captain has been notified." });
      refetch();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  const totalVerified = (data?.payments ?? []).filter((p) => p.status === "VERIFIED").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Payments"
        subtitle={`Transaction verification · ${formatMoney(totalVerified)} verified revenue`}
      />

      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {["PENDING", "VERIFIED", "REJECTED", "REFUNDED", "ALL"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Transaction ID, REG ID or team…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <LoadingRows count={4} />
      ) : payments.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-10 w-10" />} title="No payments" description="Payment submissions appear here for verification." />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamLogo name={p.registration.team.name} logoUrl={p.registration.team.logoUrl} size={40} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.registration.team.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.registration.tournament.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-primary">{formatMoney(p.amount)}</span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Method</p>
                    <p className="font-medium">{p.method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transaction ID</p>
                    <p className="font-mono">{p.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sender</p>
                    <p className="font-mono">{p.senderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">REG ID</p>
                    <p className="font-mono">{p.registration.regId}</p>
                  </div>
                </div>

                {p.rejectionReason && (
                  <p className="text-xs text-rose-400">Rejection reason: {p.rejectionReason}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap border-t border-border pt-3">
                  {p.screenshotUrl && (
                    <Button size="sm" variant="outline" onClick={() => setViewer(p.screenshotUrl!)}>
                      <Receipt className="h-3.5 w-3.5" /> View Screenshot
                    </Button>
                  )}
                  {p.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => act(p.id, "VERIFIED")}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = window.prompt("Rejection reason (required):");
                          if (reason && reason.trim()) act(p.id, "REJECTED", reason);
                        }}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {p.status === "VERIFIED" && (
                    <Button size="sm" variant="outline" onClick={() => act(p.id, "REFUNDED")}>
                      <Coins className="h-3.5 w-3.5" /> Mark Refunded
                    </Button>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="bg-popover border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Payment Screenshot</DialogTitle>
          </DialogHeader>
          { }
          {viewer && <img src={viewer} alt="Payment screenshot" className="w-full rounded-lg border border-border" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
