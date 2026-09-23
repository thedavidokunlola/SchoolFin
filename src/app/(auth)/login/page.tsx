"use client";

// src/app/(auth)/login/page.tsx
// High-standard split-screen, 100vh non-scrollable desktop layout for Portal Login.

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { schoolConfig } from "../../../../school.config";
import { ROLE_DASHBOARDS, type UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Check,
  Copy,
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const setupParam = searchParams.get("setup");

  const [email, setEmail] = useState("bursar@schoolfin.ng");
  const [password, setPassword] = useState("Bursar@School2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFillBursar = () => {
    setEmail("bursar@schoolfin.ng");
    setPassword("Bursar@School2026!");
    setError(null);
  };

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
        setError("Invalid email or password");
        setIsLoading(false);
      } else {
        const session = await getSession();
        const role = session?.user?.role as UserRole | undefined;
        const targetUrl = role ? ROLE_DASHBOARDS[role] : "/bursar/dashboard";
        window.location.href = targetUrl;
      }
    } catch {
      setError("Invalid email or password");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Sign In
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Sign in with your email and password to access your dashboard.
        </p>
      </div>

      {/* Bursary Login Details Card */}
      <div className="p-3.5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#1E257A] uppercase tracking-wider">
            <KeyRound className="w-3.5 h-3.5 text-[#2B35AF]" />
            <span>Bursary Credentials</span>
          </div>
          <button
            type="button"
            onClick={handleFillBursar}
            className="text-[11px] font-bold text-[#1E257A] hover:text-[#161B58] bg-white border border-indigo-200 hover:border-indigo-300 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-[#2B35AF]" /> Auto-Fill
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/80">
            <div className="truncate mr-1">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Email</span>
              <span className="font-bold text-slate-800 text-[11px] truncate block">bursar@schoolfin.ng</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy("bursar@schoolfin.ng", "email")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md shrink-0"
              title="Copy email"
            >
              {copiedField === "email" ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/80">
            <div className="truncate mr-1">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Password</span>
              <span className="font-mono font-bold text-slate-800 text-[11px] truncate block">Bursar@School2026!</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy("Bursar@School2026!", "password")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md shrink-0"
              title="Copy password"
            >
              {copiedField === "password" ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {setupParam === "complete" && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>School portal setup complete! Sign in with your account to get started.</span>
          </div>
        )}

        {reason === "session_expired" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Your session has expired. Please sign in again.</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-900 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bursar@schoolfin.ng"
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-slate-900 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#1E257A] hover:underline font-bold transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-slate-900 outline-none transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="accent"
          isLoading={isLoading}
          className="w-full py-3.5 text-sm font-black rounded-xl bg-[#1E257A] hover:bg-[#161B58] text-white shadow-md shadow-[#1E257A]/15 flex items-center justify-center gap-2 cursor-pointer"
        >
          Sign In to Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <Link
          href="/verify/receipt/RCP-2026-000001"
          className="font-bold text-slate-600 hover:text-[#1E257A] underline transition-colors"
        >
          Verify fee receipt
        </Link>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted & Secure</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full h-screen min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* ================= LEFT PANE: FULL-BLEED IMAGE WITH BRANDING (100vh) ================= */}
      <div className="hidden lg:flex lg:w-[45%] h-full relative overflow-hidden select-none bg-slate-900 flex-col justify-between p-10 xl:p-14">
        {/* Background Image */}
        <Image
          src="/images/image.webp"
          alt="School Portal"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-cover object-center"
        />
        {/* Subtle Dark Gradient Overlay for optimal text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090D1A]/85 via-[#090D1A]/30 to-[#090D1A]/75 pointer-events-none" />

        {/* Top Header School Branding */}
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-inner">
            <div className="p-1 bg-[#2B35AF] rounded-lg text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black tracking-wider uppercase text-slate-100">
              SchoolFin Enterprise
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight drop-shadow-md">
              {schoolConfig.name}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 font-medium drop-shadow-sm">
              Official school fees, billing, and finance portal
            </p>
          </div>
        </div>

        {/* Bottom Clean Security Badge */}
        <div className="relative z-10 pt-4 flex items-center gap-1.5 text-[11px] text-indigo-200/90 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Secure single-school deployment • 256-bit AES encryption</span>
        </div>
      </div>

      {/* RIGHT PANE: LOGIN FORM (100vh) */}
      <div className="w-full lg:w-[55%] h-full flex flex-col justify-center items-center p-6 sm:p-10 xl:p-14 overflow-y-auto lg:overflow-hidden bg-white">
        <Suspense
          fallback={
            <div className="w-full max-w-md text-center py-12">
              <div className="w-8 h-8 border-2 border-[#1E257A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">Loading portal...</p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
