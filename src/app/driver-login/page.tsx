"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, normalizePhoneToE164 } from "@/lib/utils";

export default function DriverLoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const identifier = mode === "email" ? email.trim() : phone.trim();
      if (!identifier || !password) {
        setError("Please enter your credentials.");
        setLoading(false);
        return;
      }

      // Normalize phone number to E.164 format for Supabase
      const phoneForAuth = mode === "phone" ? normalizePhoneToE164(identifier) : undefined;
      const emailForAuth = mode === "email" ? identifier : undefined;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailForAuth,
        phone: phoneForAuth,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Validate driver status + portal access
      const check = await fetch("/api/driver/me", { cache: "no-store" });
      if (!check.ok) {
        await supabase.auth.signOut();
        const body = await check.json().catch(() => ({}));
        setError(body?.error || "Your driver account is disabled or does not have portal access.");
        setLoading(false);
        return;
      }

      router.push("/driver");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Driver Login</h1>
          <p className="text-sm text-muted-foreground">Sign in with the credentials provided by your fleet.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("email")}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-medium transition",
              mode === "email" ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"
            )}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setMode("phone")}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-medium transition",
              mode === "phone" ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"
            )}
          >
            Phone
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {mode === "email" ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                required
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15555555555"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
