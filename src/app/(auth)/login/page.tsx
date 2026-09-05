"use client";

// src/app/(auth)/login/page.tsx
// Login page with email/password authentication, subtle interactive background,
// and instant role-based dashboard redirection.

import React, { useState, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { schoolConfig } from "../../../../school.config";
import { ROLE_DASHBOARDS, type UserRole } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";
import { Lock, Mail, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (res?.error) {
        // Generic failure message per Rule AUTH-7 / A1-AC2
        setError("Invalid email or password");
        setIsLoading(false);
      } else {
        // Fetch session to determine role dashboard and perform direct browser redirect
        const session = await getSession();
        const role = session?.user?.role as UserRole | undefined;
        const targetUrl = role ? ROLE_DASHBOARDS[role] : "/proprietor/dashboard";

        // Direct browser navigation ensures session cookies are fresh and bypasses landing page
        window.location.href = targetUrl;
      }
    } catch {
      setError("Invalid email or password");
      setIsLoading(false);
    }
  };

  return (
    <div
      data-no-bg-interaction="true"
      className="w-full max-w-md space-y-6 relative z-10 my-auto"
    >
      {/* School Name & Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          {schoolConfig.name}
        </h1>
        <p className="text-xs text-[#2B35AF] font-bold tracking-wide uppercase">
          Finance & Fee Management Portal
        </p>
      </div>

      {/* Clean Login Card */}
      <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden text-slate-900">
        <CardHeader className="pb-4 pt-6 border-b border-slate-100">
          <CardTitle className="text-slate-900 text-lg font-bold tracking-tight">Sign In</CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-5">
            {reason === "session_expired" && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Your session has expired. Please sign in again.</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-[#2B35AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B35AF]/20 focus:border-[#2B35AF] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#2B35AF] hover:text-[#1E257A] font-bold transition-colors hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#2B35AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B35AF]/20 focus:border-[#2B35AF] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 rounded-lg transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-slate-100 pt-4 pb-6 flex flex-col gap-3">
            <Button
              type="submit"
              variant="accent"
              isLoading={isLoading}
              className="w-full py-3.5 text-sm font-extrabold rounded-2xl bg-[#2B35AF] hover:bg-[#1E257A] text-white shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Sign In to Portal <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Footer Info & Receipt Quick Link */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secured with 256-bit AES Encryption</span>
        </div>
        <div>
          <Link
            href="/verify/receipt/RCP-2026-000001"
            className="text-xs text-slate-600 hover:text-[#2B35AF] font-semibold underline underline-offset-4 transition-colors"
          >
            Verify a student fee receipt
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 selection:bg-[#2B35AF] selection:text-white relative overflow-hidden">
      {/* Subtle Mouse-Tracking Interactive Background */}
      <InteractiveBackground />

      <Suspense
        fallback={
          <div className="w-full max-w-md text-center py-12 relative z-10">
            <div className="w-8 h-8 border-2 border-[#2B35AF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Loading portal...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
