"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Palette, Plus, Settings2, Trash2, X } from "lucide-react";
import { useApiData } from "../data-hooks";
import { useSettings } from "../settings-context";
import { LoadingRows, SectionHeader } from "../shared/kit";
import { api } from "@/lib/api-client";

type SettingsData = {
  settings: {
    platformName: string;
    accentColor: string;
    contactEmail: string;
    contactPhone: string;
    paymentMethods: { name: string; number: string; type: string }[];
    paymentInstructions: string;
    faq: { q: string; a: string }[];
  };
};

const ACCENT_PRESETS = ["#FF7A1C", "#F43F5E", "#22C55E", "#A855F7", "#EAB308", "#06B6D4"];

export function AdminSettings() {
  const { data, loading, refetch } = useApiData<SettingsData>("/api/admin/settings");
  const { refetchBootstrap } = useSettings();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<SettingsData["settings"] | null>(null);

  useEffect(() => {
    if (data?.settings && !form) {
      setForm({
        ...data.settings,
        paymentMethods: data.settings.paymentMethods ?? [],
        faq: data.settings.faq ?? [],
      });
    }
  }, [data, form]);

  if (loading || !form) return <LoadingRows count={3} />;

  async function save() {
    setBusy(true);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        json: {
          platformName: form.platformName,
          accentColor: form.accentColor,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          paymentMethods: form.paymentMethods.filter((m) => m.name && m.number),
          paymentInstructions: form.paymentInstructions,
          faq: form.faq.filter((f) => f.q && f.a),
        },
      });
      toast({ title: "Settings saved", description: "The platform has been updated." });
      refetch();
      refetchBootstrap();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader title="Platform Settings" subtitle="General, payment and notification configuration (PRD 64)" />

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-primary">
            <Settings2 className="h-4 w-4" /> General
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Platform Name</Label>
              <Input value={form.platformName} onChange={(e) => setForm({ ...form, platformName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-primary">
            <Palette className="h-4 w-4" /> Accent Color
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                className="h-10 w-10 rounded-lg border-2 transition-transform hover:scale-110 cursor-pointer"
                style={{ background: c, borderColor: form.accentColor === c ? "#fff" : "transparent" }}
                onClick={() => setForm({ ...form, accentColor: c })}
                aria-label={`Accent ${c}`}
              />
            ))}
            <Input
              className="w-32 font-mono"
              value={form.accentColor}
              onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The accent color applies platform-wide instantly after saving (PRD 48 — configurable esports accent).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-primary">
            💳 Payment Methods
          </h3>
          <div className="space-y-2">
            {form.paymentMethods.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <Input
                  placeholder="Name (e.g. bKash)"
                  value={m.name}
                  onChange={(e) => {
                    const methods = [...form.paymentMethods];
                    methods[i] = { ...m, name: e.target.value };
                    setForm({ ...form, paymentMethods: methods });
                  }}
                />
                <Input
                  placeholder="Number (e.g. 01712-345678)"
                  value={m.number}
                  onChange={(e) => {
                    const methods = [...form.paymentMethods];
                    methods[i] = { ...m, number: e.target.value };
                    setForm({ ...form, paymentMethods: methods });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() => setForm({ ...form, paymentMethods: form.paymentMethods.filter((_, idx) => idx !== i) })}
                  aria-label="Remove method"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, paymentMethods: [...form.paymentMethods, { name: "", number: "", type: "Mobile Wallet" }] })}
            >
              <Plus className="h-4 w-4" /> Add Method
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Instructions</Label>
            <Textarea
              rows={3}
              value={form.paymentInstructions}
              onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-primary">
            ❓ FAQ (shown on tournament pages)
          </h3>
          <div className="space-y-3">
            {form.faq.map((f, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Question"
                    value={f.q}
                    onChange={(e) => {
                      const faq = [...form.faq];
                      faq[i] = { ...f, q: e.target.value };
                      setForm({ ...form, faq });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground shrink-0"
                    onClick={() => setForm({ ...form, faq: form.faq.filter((_, idx) => idx !== i) })}
                    aria-label="Remove FAQ"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  placeholder="Answer"
                  value={f.a}
                  onChange={(e) => {
                    const faq = [...form.faq];
                    faq[i] = { ...f, a: e.target.value };
                    setForm({ ...form, faq });
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, faq: [...form.faq, { q: "", a: "" }] })}
            >
              <Plus className="h-4 w-4" /> Add FAQ
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button className="btn-primary-glow w-full sm:w-auto" onClick={save} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save All Settings
      </Button>
    </div>
  );
}
