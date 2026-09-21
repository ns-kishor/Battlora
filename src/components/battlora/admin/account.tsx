"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  CircleUserRound,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "../auth-context";
import { LoadingRows, RoleBadge, SectionHeader, StatusBadge } from "../shared/kit";
import { api } from "@/lib/api-client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2">
      {message}
    </p>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  hint,
  autoComplete,
  placeholder = "••••••••",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  hint?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground -mt-0.5">{hint}</p>}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-10"
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function AdminAccount() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [emailPassword, setEmailPassword] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [busyProfile, setBusyProfile] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busyPassword, setBusyPassword] = useState(false);

  useEffect(() => {
    if (user) setProfile({ name: user.name, email: user.email });
  }, [user?.name, user?.email]);

  if (!user) return <LoadingRows count={2} />;

  const name = profile.name.trim();
  const email = profile.email.trim().toLowerCase();
  const emailChanging = email !== user.email;
  const profileDirty = name !== user.name || emailChanging;

  async function saveProfile() {
    setProfileError(null);
    if (name.length < 2) return setProfileError("Name must be at least 2 characters.");
    if (name.length > 60) return setProfileError("Name is too long (max 60 characters).");
    if (!EMAIL_RE.test(email)) return setProfileError("Please enter a valid email address.");
    if (emailChanging && !emailPassword)
      return setProfileError("Enter your current password to change your login email.");

    setBusyProfile(true);
    try {
      await api("/api/me/account", {
        method: "PATCH",
        json: {
          name,
          email,
          ...(emailChanging ? { currentPassword: emailPassword } : {}),
        },
      });
      toast({
        title: "Profile updated",
        description: emailChanging
          ? "Your account details were saved — use the new email to sign in next time."
          : "Your account details have been saved.",
      });
      setEmailPassword("");
      await refresh(); // sidebar + auth context pick up the new name/email
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyProfile(false);
    }
  }

  async function savePassword() {
    setPasswordError(null);
    if (!pw.current) return setPasswordError("Enter your current password.");
    if (pw.next.length < 6)
      return setPasswordError("New password must be at least 6 characters.");
    if (pw.next !== pw.confirm)
      return setPasswordError("New passwords do not match.");
    if (pw.next === pw.current)
      return setPasswordError("New password must be different from your current password.");

    setBusyPassword(true);
    try {
      await api("/api/me/account", {
        method: "PATCH",
        json: { currentPassword: pw.current, newPassword: pw.next },
      });
      toast({
        title: "Password updated",
        description: "You're still signed in here — all other devices have been signed out.",
      });
      setPw({ current: "", next: "", confirm: "" });
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyPassword(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader
        title="My Account"
        subtitle="Manage your own name, login email and password."
      />

      {/* Read-only identity summary */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="grid place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary h-9 w-9 shrink-0">
          <CircleUserRound className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate flex items-center gap-2">
            {user.name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
        </div>
      </div>

      {/* Profile: name + login email */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-primary">
            <CircleUserRound className="h-4 w-4" /> Profile
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="acc-name"
                value={profile.name}
                onChange={(e) => {
                  setProfile((p) => ({ ...p, name: e.target.value }));
                  setProfileError(null);
                }}
                className="pl-9"
                placeholder="Your full name"
                maxLength={60}
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-email">Login Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="acc-email"
                type="email"
                value={profile.email}
                onChange={(e) => {
                  setProfile((p) => ({ ...p, email: e.target.value }));
                  setProfileError(null);
                }}
                className="pl-9"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You will use this email to sign in to Battlora.
            </p>
          </div>

          {emailChanging && (
            <PasswordField
              id="acc-email-pass"
              label="Current Password"
              hint="Required to confirm the email change."
              value={emailPassword}
              onChange={(v) => {
                setEmailPassword(v);
                setProfileError(null);
              }}
              show={showEmailPassword}
              onToggle={() => setShowEmailPassword((v) => !v)}
              autoComplete="current-password"
            />
          )}

          <FieldError message={profileError} />

          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={busyProfile || !profileDirty}>
              {busyProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Save Profile
                </>
              )}
            </Button>
            {profileDirty && (
              <span className="text-xs text-amber-400">Unsaved changes</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password change */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-primary">
            <KeyRound className="h-4 w-4" /> Password
          </h3>

          <PasswordField
            id="acc-pw-current"
            label="Current Password"
            value={pw.current}
            onChange={(v) => {
              setPw((p) => ({ ...p, current: v }));
              setPasswordError(null);
            }}
            show={showPw.current}
            onToggle={() => setShowPw((s) => ({ ...s, current: !s.current }))}
            autoComplete="current-password"
          />
          <PasswordField
            id="acc-pw-new"
            label="New Password"
            hint="At least 6 characters."
            value={pw.next}
            onChange={(v) => {
              setPw((p) => ({ ...p, next: v }));
              setPasswordError(null);
            }}
            show={showPw.next}
            onToggle={() => setShowPw((s) => ({ ...s, next: !s.next }))}
            autoComplete="new-password"
          />
          <PasswordField
            id="acc-pw-confirm"
            label="Confirm New Password"
            value={pw.confirm}
            onChange={(v) => {
              setPw((p) => ({ ...p, confirm: v }));
              setPasswordError(null);
            }}
            show={showPw.confirm}
            onToggle={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
            autoComplete="new-password"
          />

          <FieldError message={passwordError} />

          <div className="flex items-center gap-3">
            <Button onClick={savePassword} disabled={busyPassword || !pw.current || !pw.next || !pw.confirm}>
              {busyPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" /> Update Password
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              Changing your password signs out all other devices.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
