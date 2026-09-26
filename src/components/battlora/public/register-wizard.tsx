"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  ImagePlus,
  ListChecks,
  Loader2,
  PartyPopper,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "../router";
import { useAuth } from "../auth-context";
import { useApiData } from "../data-hooks";
import { BrandLogo, TournamentStatusBadge, TeamLogo, ErrorBanner } from "../shared/kit";
import { api } from "@/lib/api-client";
import { compressImage, formatMoney } from "@/lib/format";
import { PLAYER_ROLES } from "@/lib/types";
import { cn } from "@/lib/utils";

type PlayerForm = {
  realName: string;
  ign: string;
  uid: string;
  phone: string;
  role: string;
  photoUrl: string | null;
  isSubstitute: boolean;
};

const STEPS = [
  { id: 1, label: "Account", icon: ShieldCheck },
  { id: 2, label: "Team", icon: Users },
  { id: 3, label: "Players", icon: UserPlus },
  { id: 4, label: "Substitute", icon: ClipboardCheck },
  { id: 5, label: "Payment", icon: Coins },
  { id: 6, label: "Agreement", icon: ListChecks },
  { id: 7, label: "Submit", icon: Trophy },
];

export function RegisterWizard({ tournamentId }: { tournamentId?: string }) {
  const { navigate } = useRouter();
  const { user, login, register: registerUser } = useAuth();
  const { data: tData } = useApiData<{
    tournament: {
      id: string;
      name: string;
      entryFee: number;
      teamLimit: number;
      playersPerTeam: number;
      substituteAllowed: boolean;
      status: string;
      registrationEnd: string | null;
    };
    paymentMethods: { name: string; number: string; type: string }[];
    paymentInstructions: string;
    myRegistration: { regId: string; status: string } | null;
  }>(tournamentId ? `/api/tournaments/${tournamentId}` : null);

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ regId: string; team: string; tournament: string } | null>(null);

  // auth step
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", phone: "", password: "" });

  // team step
  const [teamForm, setTeamForm] = useState({ name: "", logoUrl: null as string | null, contactNumber: "", email: "" });

  // players step
  const [players, setPlayers] = useState<PlayerForm[]>([]);
  const [sub, setSub] = useState<PlayerForm | null>(null);

  // payment step
  const [payment, setPayment] = useState({ method: "", transactionId: "", senderNumber: "", screenshotUrl: null as string | null });

  // agreement
  const [agreed, setAgreed] = useState(false);

  // Load existing team info if captain already has one
  useEffect(() => {
    if (!user) return;
    api<{ team: { name: string; logoUrl: string | null; contactNumber: string | null; email: string | null; players: { realName: string; ign: string; uid: string; phone: string | null; role: string; photoUrl: string | null; isSubstitute: boolean }[] } | null }>(
      "/api/me/team"
    )
      .then(({ team }) => {
        if (team) {
          setTeamForm({
            name: team.name,
            logoUrl: team.logoUrl,
            contactNumber: team.contactNumber ?? user.phone ?? "",
            email: team.email ?? user.email,
          });
          if (team.players.length > 0) {
            setPlayers(
              team.players
                .filter((p) => !p.isSubstitute)
                .map((p) => ({
                  realName: p.realName,
                  ign: p.ign,
                  uid: p.uid,
                  phone: p.phone ?? "",
                  role: p.role === "SUBSTITUTE" ? "PLAYER" : p.role,
                  photoUrl: p.photoUrl,
                  isSubstitute: false,
                }))
            );
            const substitute = team.players.find((p) => p.isSubstitute);
            if (substitute) {
              setSub({
                realName: substitute.realName,
                ign: substitute.ign,
                uid: substitute.uid,
                phone: substitute.phone ?? "",
                role: "PLAYER",
                photoUrl: substitute.photoUrl,
                isSubstitute: true,
              });
            }
          }
        } else {
          setTeamForm((f) => ({
            ...f,
            contactNumber: f.contactNumber || (user.phone ?? ""),
            email: f.email || user.email,
          }));
        }
      })
      .catch(() => { });
  }, [user]);

  const t = tData?.tournament;
  const needsPayment = (t?.entryFee ?? 0) > 0;

  const mainPlayersValid = useMemo(
    () => players.length >= (t?.playersPerTeam ?? 4) && players.every((p) => p.ign.trim() && /^\d{6,12}$/.test(p.uid)),
    [players, t?.playersPerTeam]
  );

  if (!tournamentId || !t) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading tournament…</p>
        </div>
      </div>
    );
  }

  // Already registered
  if (tData?.myRegistration) {
    return (
      <WizardShell tournamentName={t.name}>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <h2 className="font-display text-2xl font-bold">Already registered</h2>
            <p className="text-muted-foreground">
              Your registration <span className="font-mono text-primary">{tData.myRegistration.regId}</span>{" "}
              is currently: <strong>{tData.myRegistration.status.replace(/_/g, " ").toLowerCase()}</strong>
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={() => navigate("/dashboard")}>Open Team Dashboard</Button>
              <Button variant="outline" onClick={() => navigate(`/tournaments/${tournamentId}`)}>
                View Tournament
              </Button>
            </div>
          </CardContent>
        </Card>
      </WizardShell>
    );
  }

  // Success screen
  if (result) {
    return (
      <WizardShell tournamentName={t.name}>
        <Card className="border-emerald-500/30">
          <CardContent className="p-8 text-center space-y-5">
            <PartyPopper className="h-14 w-14 text-emerald-400 mx-auto" />
            <h2 className="font-display text-3xl font-bold">Registration Submitted!</h2>
            <div className="max-w-sm mx-auto space-y-2">
              <div className="rounded-lg border border-border bg-background/60 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Registration ID</p>
                <p className="font-mono text-xl font-bold text-primary">{result.regId}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Team <strong className="text-foreground">{result.team}</strong> registered for{" "}
                <strong className="text-foreground">{result.tournament}</strong>.
                {needsPayment
                  ? " Your payment is now being verified by the finance team."
                  : " Your registration is under review by the tournament admins."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button className="btn-primary-glow" onClick={() => navigate("/dashboard")}>
                Go to Team Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate("/tournaments")}>
                Browse Tournaments
              </Button>
            </div>
          </CardContent>
        </Card>
      </WizardShell>
    );
  }

  function next() {
    setError(null);
    if (step === 1 && !user) {
      setError("Please sign in or create an account to continue.");
      return;
    }
    if (step === 2) {
      if (teamForm.name.trim().length < 3) {
        setError("Team name must be at least 3 characters.");
        return;
      }
      if (!teamForm.contactNumber.trim()) {
        setError("Contact number is required.");
        return;
      }
    }
    if (step === 3 && !mainPlayersValid) {
      setError(
        `Add ${t?.playersPerTeam ?? 4} main players with valid IGN and UID (6–12 digits).`
      );
      return;
    }
    if (step === 5 && needsPayment) {
      if (!payment.method) {
        setError("Select a payment method.");
        return;
      }
      if (payment.transactionId.trim().length < 4) {
        setError("Enter the Transaction ID from your payment receipt.");
        return;
      }
      if (!payment.senderNumber.trim()) {
        setError("Enter the number you sent the payment from.");
        return;
      }
      if (!payment.screenshotUrl) {
        setError("Upload a screenshot of your payment for verification.");
        return;
      }
    }
    setStep((s) => Math.min(7, s + 1));
  }

  async function submit() {
    if (!agreed) {
      setError("You must accept the Tournament Rules and Regulations.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ registration: { regId: string; team: string; tournament: string } }>(
        "/api/registrations",
        {
          json: {
            tournamentId: t?.id,
            team: teamForm,
            players: [...players, ...(sub ? [sub] : [])],
            payment: needsPayment ? payment : undefined,
            agreementAccepted: agreed,
          },
        }
      );
      setResult(res.registration);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setStep(6);
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardShell tournamentName={t.name}>
      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2">
        {STEPS.filter((s) => s.id !== 4 || t.substituteAllowed).filter((s) => s.id !== 5 || needsPayment).map((s, i, arr) => (
          <div key={s.id} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => s.id < step && setStep(s.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                step === s.id
                  ? "border-primary bg-primary/15 text-primary"
                  : step > s.id
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 cursor-pointer"
                    : "border-border bg-card text-muted-foreground"
              )}
            >
              {step > s.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.id}</span>
            </button>
            {i < arr.length - 1 && <span className="h-px w-4 bg-border" />}
          </div>
        ))}
      </div>

      {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

      <Card className="mt-4">
        <CardContent className="p-5 sm:p-7">
          {/* ============ STEP 1: ACCOUNT ============ */}
          {step === 1 && (
            <div className="space-y-5">
              <StepHeader title="Step 1 — Account" desc="Sign in or create your Battlora account." />
              {user ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <div>
                    <p className="font-medium">Signed in as {user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={authMode === "login" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAuthMode("login")}
                    >
                      Sign In
                    </Button>
                    <Button
                      variant={authMode === "register" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAuthMode("register")}
                    >
                      Create Account
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {authMode === "register" && (
                      <div className="space-y-1.5">
                        <Label>Full Name</Label>
                        <Input
                          placeholder="Your name"
                          value={authForm.name}
                          onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      />
                    </div>
                    {authMode === "register" && (
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input
                          placeholder="+880 1XXX-XXXXXX"
                          value={authForm.phone}
                          onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="Min 6 characters"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      try {
                        if (authMode === "login") {
                          await login(authForm.email, authForm.password);
                        } else {
                          await registerUser(authForm.name, authForm.email, authForm.phone, authForm.password);
                        }
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Authentication failed");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Please wait…" : authMode === "login" ? "Sign In" : "Create Account"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ============ STEP 2: TEAM ============ */}
          {step === 2 && (
            <div className="space-y-5">
              <StepHeader title="Step 2 — Team Information" desc="Your team identity in the tournament." />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Team Name *</Label>
                  <Input
                    placeholder="e.g. Team Alpha"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Captain Name</Label>
                  <Input value={user?.name ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Number *</Label>
                  <Input
                    placeholder="+880 1XXX-XXXXXX"
                    value={teamForm.contactNumber}
                    onChange={(e) => setTeamForm({ ...teamForm, contactNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="team@example.com"
                    value={teamForm.email}
                    onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                  />
                </div>
              </div>
              <LogoUpload
                label="Team Logo"
                value={teamForm.logoUrl}
                onChange={(url) => setTeamForm({ ...teamForm, logoUrl: url })}
              />
            </div>
          )}

          {/* ============ STEP 3: PLAYERS ============ */}
          {step === 3 && (
            <div className="space-y-5">
              <StepHeader
                title="Step 3 — Players"
                desc={`Add exactly ${t.playersPerTeam} main players (including the captain if playing).`}
              />
              <PlayerListEditor
                players={players}
                onChange={setPlayers}
                requiredCount={t.playersPerTeam}
                allowAdd
              />
            </div>
          )}

          {/* ============ STEP 4: SUBSTITUTE ============ */}
          {step === 4 && t.substituteAllowed && (
            <div className="space-y-5">
              <StepHeader
                title="Step 4 — Substitute (Optional)"
                desc="One substitute player is allowed. They can be swapped in with admin approval."
              />
              {sub ? (
                <div className="space-y-3">
                  <PlayerListEditor players={[sub]} onChange={(list) => setSub(list[0] ?? null)} requiredCount={0} allowAdd={false} />
                  <Button variant="outline" size="sm" onClick={() => setSub(null)}>
                    <X className="h-4 w-4" /> Remove substitute
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setSub({ realName: "", ign: "", uid: "", phone: "", role: "PLAYER", photoUrl: null, isSubstitute: true })}>
                  <UserPlus className="h-4 w-4" /> Add substitute player
                </Button>
              )}
            </div>
          )}

          {/* ============ STEP 5: PAYMENT ============ */}
          {step === 5 && (
            <div className="space-y-5">
              <StepHeader
                title="Step 5 — Payment"
                desc={`Entry fee: ${formatMoney(t.entryFee)}. Submit your transaction details for verification.`}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {tData?.paymentMethods.map((m) => (
                  <button
                    key={m.number}
                    onClick={() => setPayment({ ...payment, method: m.name })}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors cursor-pointer",
                      payment.method === m.name
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.type}</p>
                    <code className="text-xs block mt-1.5 text-primary">{m.number}</code>
                  </button>
                ))}
              </div>
              {tData?.paymentInstructions && (
                <p className="text-sm text-muted-foreground rounded-lg border border-border bg-background/60 p-3">
                  {tData.paymentInstructions}
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Transaction ID *</Label>
                  <Input
                    placeholder="e.g. 8N7D2K9A"
                    value={payment.transactionId}
                    onChange={(e) => setPayment({ ...payment, transactionId: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sender Number *</Label>
                  <Input
                    placeholder="Number you paid from"
                    value={payment.senderNumber}
                    onChange={(e) => setPayment({ ...payment, senderNumber: e.target.value })}
                  />
                </div>
              </div>
              <LogoUpload
                label="Payment Screenshot *"
                value={payment.screenshotUrl}
                onChange={(url) => setPayment({ ...payment, screenshotUrl: url })}
                tall
              />
            </div>
          )}

          {/* ============ STEP 6: AGREEMENT ============ */}
          {step === 6 && (
            <div className="space-y-5">
              <StepHeader title="Step 6 — Agreement" desc="Review and accept the tournament rules." />
              <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tournament</span>
                  <strong>{t.name}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Team</span>
                  <strong>{teamForm.name}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Players</span>
                  <strong>
                    {players.length} main{sub ? " + 1 sub" : ""}
                  </strong>
                </div>
                {needsPayment && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entry fee</span>
                    <strong className="text-primary">{formatMoney(t.entryFee)}</strong>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate(`/tournaments/${tournamentId}?tab=rules`)}>
                  <ListChecks className="h-4 w-4" /> Read full rulebook
                </Button>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  I have read and agree to the{" "}
                  <strong className="text-primary">Tournament Rules and Regulations</strong>, including the
                  fair-play, anti-cheat and penalty policies. I understand that rule violations can lead
                  to point deductions, disqualification or a tournament ban.
                </span>
              </label>
            </div>
          )}

          {/* ============ STEP 7: SUBMIT ============ */}
          {step === 7 && (
            <div className="space-y-5">
              <StepHeader title="Step 7 — Review & Submit" desc="Double-check everything before submitting." />
              <ReviewBlock title="Team" items={[["Team Name", teamForm.name], ["Contact", teamForm.contactNumber], ["Email", teamForm.email]]} />
              <ReviewBlock
                title="Players"
                items={players.map((p) => [p.ign, `${p.realName} · UID ${p.uid}`] as [string, string])}
              />
              {sub && <ReviewBlock title="Substitute" items={[[sub.ign, `UID ${sub.uid}`]]} />}
              {needsPayment && (
                <ReviewBlock
                  title="Payment"
                  items={[
                    ["Method", payment.method],
                    ["Transaction ID", payment.transactionId],
                    ["Sender", payment.senderNumber],
                    ["Amount", formatMoney(t.entryFee)],
                  ]}
                />
              )}
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-muted-foreground">
                After submission you will receive a{" "}
                <strong className="text-foreground">Registration ID</strong> (e.g. REG-2026-00128).
                {needsPayment
                  ? " The finance team will verify your payment before approval."
                  : " Tournament admins will review your registration."}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-border">
            <Button variant="ghost" onClick={() => (step > 1 ? setStep(step - 1) : navigate(`/tournaments/${tournamentId}`))}>
              <ArrowLeft className="h-4 w-4" /> {step > 1 ? "Back" : "Cancel"}
            </Button>
            {step < 7 ? (
              <Button onClick={next} className="btn-primary-glow">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={busy || !agreed} className="btn-primary-glow">
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    Submit Registration <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </WizardShell>
  );
}

// ---------- Wizard shell ----------

function WizardShell({ tournamentName, children }: { tournamentName: string; children: React.ReactNode }) {
  const { navigate } = useRouter();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="cursor-pointer">
            <BrandLogo size="sm" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-medium truncate max-w-40 sm:max-w-none">{tournamentName}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

// ---------- Logo / screenshot upload ----------

function LogoUpload({
  label,
  value,
  onChange,
  tall,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  tall?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const url = await compressImage(file, tall ? 900 : 300, 0.72);
      onChange(url);
    } catch {
      // show error via alert fallback
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value ? (
        <div className="flex items-center gap-3">
          { }
          <img
            src={value}
            alt={`${label} preview`}
            className={cn("rounded-lg border border-border object-cover", tall ? "h-24" : "h-16 w-16")}
          />
          <Button variant="outline" size="sm" onClick={() => onChange(null)}>
            <X className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            "w-full rounded-xl border border-dashed border-border hover:border-primary/50 bg-card/50 flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground transition-colors cursor-pointer",
            tall ? "h-32" : "h-24"
          )}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-xs">{busy ? "Processing…" : "Click to upload image (PNG/JPG)"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ---------- Player editor ----------

function PlayerListEditor({
  players,
  onChange,
  requiredCount,
  allowAdd,
}: {
  players: PlayerForm[];
  onChange: (players: PlayerForm[]) => void;
  requiredCount: number;
  allowAdd: boolean;
}) {
  const update = (i: number, patch: Partial<PlayerForm>) =>
    onChange(players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3">
      {players.map((p, i) => (
        <div key={i} className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">
              Player {i + 1} {requiredCount > 0 && i < requiredCount ? "(Required)" : ""}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => onChange(players.filter((_, idx) => idx !== i))}
              aria-label="Remove player"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">IGN *</Label>
              <Input placeholder="In-game name" value={p.ign} onChange={(e) => update(i, { ign: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Free Fire UID *</Label>
              <Input
                placeholder="e.g. 1234567890"
                inputMode="numeric"
                value={p.uid}
                onChange={(e) => update(i, { uid: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Real Name</Label>
              <Input placeholder="Full name" value={p.realName} onChange={(e) => update(i, { realName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input placeholder="Optional" value={p.phone} onChange={(e) => update(i, { phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={p.role} onValueChange={(v) => update(i, { role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {PLAYER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex items-end gap-2">
              {p.photoUrl && (

                <img src={p.photoUrl} alt="player" className="h-9 w-9 rounded-md object-cover border border-border" />
              )}
              <div className="flex-1">
                <LogoUpload label="" value={p.photoUrl} onChange={(url) => update(i, { photoUrl: url })} />
              </div>
            </div>
          </div>
        </div>
      ))}
      {allowAdd && (
        <Button variant="outline" onClick={() => onChange([...players, { realName: "", ign: "", uid: "", phone: "", role: "PLAYER", photoUrl: null, isSubstitute: false }])}>
          <UserPlus className="h-4 w-4" /> Add Player
          {requiredCount > 0 && players.length < requiredCount
            ? ` (${players.length}/${requiredCount})`
            : ""}
        </Button>
      )}
      {requiredCount > 0 && players.length < requiredCount && (
        <p className="text-xs text-amber-400">
          {requiredCount - players.length} more player{requiredCount - players.length > 1 ? "s" : ""} needed.
        </p>
      )}
    </div>
  );
}

function ReviewBlock({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2 divide-y divide-border/60">
        {items.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-1.5 text-sm">
            <span className="text-muted-foreground shrink-0">{k}</span>
            <span className="font-medium text-right truncate">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
