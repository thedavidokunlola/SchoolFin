"use client";

// src/app/(auth)/accept-invite/page.tsx
// Parent portal invite acceptance page

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { schoolConfig } from "../../../../school.config";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";
import { Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const acceptMutation = trpc.auth.acceptParentInvite.useMutation({
    onSuccess: (data) => {
      setUserEmail(data.email);
      setIsSuccess(true);
    },
    onError: (err) => {
      setError(err.message || "Invite link is invalid or has expired.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    acceptMutation.mutate({ token, newPassword: password });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 selection:bg-[#2B35AF] selection:text-white relative overflow-hidden">
      <InteractiveBackground />

      <div
        data-no-bg-interaction="true"
        className="w-full max-w-md space-y-6 relative z-10 my-auto"
      >
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {schoolConfig.name}
          </h1>
          <p className="text-xs text-[#2B35AF] font-bold tracking-wide uppercase">
            Parent Account Activation
          </p>
        </div>

        <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden text-slate-900">
          {isSuccess ? (
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[#2B35AF] mx-auto" />
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-slate-900 text-base">Account Activated!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your parent portal account ({userEmail}) is now active. You can sign in with your new password.
                </p>
              </div>
              <Link href="/login" className="inline-block mt-4">
                <Button variant="accent" size="sm" className="rounded-xl font-bold bg-[#2B35AF]">
                  Proceed to Sign In
                </Button>
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pt-6 pb-2 border-b border-slate-100">
                <CardTitle className="text-slate-900 text-base font-bold">Set Account Password</CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Create a password to activate your portal access
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#2B35AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#2B35AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B35AF]/20 focus:border-[#2B35AF] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 rounded-lg transition-colors"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-3 pb-6 border-t border-slate-100">
                <Button
                  type="submit"
                  variant="accent"
                  isLoading={acceptMutation.isPending}
                  className="w-full py-3.5 font-bold rounded-2xl bg-[#2B35AF] hover:bg-[#1E257A] text-white shadow-md shadow-[#2B35AF]/20"
                >
                  Activate My Account
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#2B35AF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
