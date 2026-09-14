"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, LogIn, Mail, Phone, User, type LucideIcon } from "lucide-react";
import { useRouter } from "../router";
import { useAuth } from "../auth-context";
import { BrandLogo } from "../shared/kit";
import { api } from "@/lib/api-client";

export function AuthView({ mode }: { mode: "login" | "register" }) {
  const { navigate, route } = useRouter();
  const { login, register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const next = route.query?.get("next") ?? "/dashboard";

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.phone, form.password);
      }
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero-grid-bg min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-in-up">
        <div className="text-center mb-6">
          <BrandLogo size="lg" />
        </div>

        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to manage your team and track tournaments."
                : "Join Battlora — compete in professional Free Fire tournaments."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Rahim Ahmed"
                      className="pl-9"
                      value={form.name}
                      onChange={set("name")}
                      required
                      minLength={2}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    value={form.email}
                    onChange={set("email")}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+880 1XXX-XXXXXX"
                      className="pl-9"
                      value={form.phone}
                      onChange={set("phone")}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    value={form.password}
                    onChange={set("password")}
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full btn-primary-glow" disabled={busy}>
                {busy ? (
                  "Please wait…"
                ) : (
                  <>
                    {mode === "login" ? (
                      <>
                        <LogIn className="h-4 w-4" /> Sign In
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </>
                )}
              </Button>
            </form>

            <p className="text-sm text-muted-foreground text-center mt-4">
              {mode === "login" ? (
                <>
                  New to Battlora?{" "}
                  <button
                    className="text-primary font-medium hover:underline cursor-pointer"
                    onClick={() => navigate("/register")}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    className="text-primary font-medium hover:underline cursor-pointer"
                    onClick={() => navigate("/login")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
