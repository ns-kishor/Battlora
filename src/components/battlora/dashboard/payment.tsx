"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, CreditCard, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { useApiData } from "../data-hooks";
import { useSettings } from "../settings-context";
import {
  EmptyState,
  LoadingRows,
  PaymentStatusBadge,
  RegistrationStatusBadge,
  SectionHeader,
} from "../shared/kit";
import { api } from "@/lib/api-client";
import { compressImage, formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type DashboardData = {
  registrations: {
    id: string;
    regId: string;
    status: string;
    tournament: { name: string; entryFee: number };
    payment: {
      id: string;
      method: string;
      transactionId: string;
      senderNumber: string;
      screenshotUrl: string | null;
      status: string;
      amount: number;
      rejectionReason: string | null;
    } | null;
  }[];
};

export function MyPayment() {
  const { data, loading, refetch } = useApiData<DashboardData>("/api/me/dashboard");
  const { bootstrap } = useSettings();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ method: "", transactionId: "", senderNumber: "", screenshotUrl: null as string | null });

  if (loading) return <LoadingRows count={3} />;

  const registrations = data?.registrations ?? [];
  const withPayment = registrations.filter((r) => r.payment);

  if (registrations.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Payment" subtitle="Entry fee payment status" />
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="No payments yet"
          description="Register for a paid tournament to submit your entry fee payment."
        />
      </div>
    );
  }

  async function resubmit(regId: string) {
    setBusy(true);
    try {
      await api("/api/payments", {
        json: { registrationId: regId, ...form },
      });
      toast({
        title: "Payment resubmitted",
        description: "The finance team will verify your new payment shortly.",
      });
      setEditing(null);
      setForm({ method: "", transactionId: "", senderNumber: "", screenshotUrl: null });
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

  return (
    <div className="space-y-6">
      <SectionHeader title="Payment" subtitle="Entry fee payments and verification status" />

      {withPayment.length === 0 && registrations.length > 0 && (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="No payment required"
          description="Your registrations are for free tournaments — no entry fee payment needed."
        />
      )}

      <div className="space-y-4">
        {withPayment.map((reg) => {
          const p = reg.payment!;
          const rejected = p.status === "REJECTED";
          return (
            <Card key={reg.id} className={cn(rejected && "border-rose-500/30")}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold truncate">{reg.tournament.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{reg.regId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PaymentStatusBadge status={p.status} />
                    <RegistrationStatusBadge status={reg.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-display font-bold text-primary text-lg">{formatMoney(p.amount)}</p>
                  </div>
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
                </div>

                {p.screenshotUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Submitted screenshot</p>
                    { }
                    <img
                      src={p.screenshotUrl}
                      alt="Payment screenshot"
                      className="max-h-40 rounded-lg border border-border object-contain"
                    />
                  </div>
                )}

                {rejected && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                    <strong>Rejected:</strong> {p.rejectionReason ?? "No reason provided."}
                  </div>
                )}

                {p.status === "VERIFIED" && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Payment verified — registration under review.
                  </div>
                )}

                {(rejected || p.status === "PENDING") && editing !== reg.id && (
                  <Button
                    variant={rejected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEditing(reg.id);
                      setForm({
                        method: p.method,
                        transactionId: rejected ? "" : p.transactionId,
                        senderNumber: p.senderNumber,
                        screenshotUrl: rejected ? null : p.screenshotUrl,
                      });
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {rejected ? "Resubmit Payment" : "Update Payment"}
                  </Button>
                )}

                {editing === reg.id && (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-4">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      {rejected ? "Resubmit payment" : "Update payment details"}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Payment Method *</Label>
                        <select
                          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                          value={form.method}
                          onChange={(e) => setForm({ ...form, method: e.target.value })}
                        >
                          <option value="">Select method</option>
                          {(bootstrap?.settings.paymentMethods ?? []).map((m) => (
                            <option key={m.number} value={m.name} className="bg-popover">
                              {m.name} — {m.number}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Transaction ID *</Label>
                        <Input
                          value={form.transactionId}
                          onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                          placeholder="From your payment receipt"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Sender Number *</Label>
                        <Input
                          value={form.senderNumber}
                          onChange={(e) => setForm({ ...form, senderNumber: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Payment Screenshot *</Label>
                      {form.screenshotUrl ? (
                        <div className="flex items-center gap-3">
                          { }
                          <img src={form.screenshotUrl} alt="Payment screenshot" className="h-20 rounded-lg border border-border object-cover" />
                          <Button variant="outline" size="sm" onClick={() => setForm({ ...form, screenshotUrl: null })}>
                            Replace
                          </Button>
                        </div>
                      ) : (
                        <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 text-muted-foreground transition-colors hover:border-primary/50">
                          <ImagePlus className="h-5 w-5" />
                          <span className="text-xs">Upload payment screenshot</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) setForm({ ...form, screenshotUrl: await compressImage(f, 900, 0.72) });
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => resubmit(reg.id)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Payment"}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(bootstrap?.settings.paymentMethods ?? []).length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
              Official Payment Methods
            </h3>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              {bootstrap!.settings.paymentMethods.map((m) => (
                <div key={m.number} className="rounded-lg border border-border bg-background/60 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.type}</p>
                  </div>
                  <code className="text-sm text-primary">{m.number}</code>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{bootstrap?.settings.paymentInstructions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
