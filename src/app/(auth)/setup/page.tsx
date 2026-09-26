"use client";

// src/app/(auth)/setup/page.tsx
// High-standard split-screen, 100vh non-scrollable desktop layout for Portal Setup & Admin Onboarding.

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { schoolConfig } from "../../../../school.config";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck,
  GraduationCap,
  Mail,
  Lock,
  Phone,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  UserCheck,
  KeyRound,
  RefreshCw,
  Check,
} from "lucide-react";

const OFFICE_POSITIONS = [
  "Proprietor / School Owner",
  "Principal / Head of School",
  "Executive Director",
  "Chairman / Board Member",
  "Administrator / Head of Finance",
  "Other",
];

export default function SchoolSetupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Admin Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [officePosition, setOfficePosition] = useState("Proprietor / School Owner");
  const [customPosition, setCustomPosition] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: 6-Digit OTP Verification
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: Academic Term
  const currentYear = new Date().getFullYear();
  const [termName, setTermName] = useState(`${currentYear}/${currentYear + 1} - First Term`);
  const [startDate, setStartDate] = useState(`${currentYear}-09-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-15`);
  const [paymentDueDate, setPaymentDueDate] = useState(`${currentYear}-10-15`);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Check setup status
  const { data: setupStatus, isLoading: isCheckingStatus } = trpc.auth.getSetupStatus.useQuery();

  // Send OTP Mutation
  const sendOtpMutation = trpc.auth.sendSetupOtp.useMutation({
    onSuccess: () => {
      setStep(2);
      setResendCooldown(60);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err.message || "Failed to dispatch verification code.");
    },
  });

  // Final Initialize Portal Mutation
  const initializeMutation = trpc.auth.initializeSchool.useMutation({
    onSuccess: async () => {
      setIsSigningIn(true);
      try {
        const res = await signIn("credentials", {
          redirect: false,
          email: email.trim(),
          password,
        });

        if (res?.error) {
          window.location.href = "/login?setup=complete";
        } else {
          window.location.href = "/proprietor/dashboard";
        }
      } catch {
        window.location.href = "/login?setup=complete";
      }
    },
    onError: (err) => {
      setFormError(err.message || "Failed to initialize school portal.");
    },
  });

  // Handle countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Submit Admin info and request email OTP
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError("Please fill in all required administrator fields.");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    sendOtpMutation.mutate({
      email: email.trim(),
      adminName: `${firstName.trim()} ${lastName.trim()}`,
    });
  };

  // Step 2: Handle 6-digit OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      if (digits.length > 0) {
        const newOtp = [...otpDigits];
        digits.forEach((d, i) => {
          if (index + i < 6) newOtp[index + i] = d;
        });
        setOtpDigits(newOtp);
        const nextIndex = Math.min(index + digits.length, 5);
        otpInputsRef.current[nextIndex]?.focus();
      }
      return;
    }

    const cleanVal = value.replace(/\D/g, "");
    const newOtp = [...otpDigits];
    newOtp[index] = cleanVal;
    setOtpDigits(newOtp);

    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleStep2Verify = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setFormError("Please enter the complete 6-digit verification code.");
      return;
    }

    setStep(3);
  };

  const handleResendOtp = () => {
    if (resendCooldown > 0 || sendOtpMutation.isPending) return;
    sendOtpMutation.mutate({
      email: email.trim(),
      adminName: `${firstName.trim()} ${lastName.trim()}`,
    });
  };

  // Step 3: Final Submit with verified OTP code
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!termName.trim() || !startDate || !endDate) {
      setFormError("Please provide all academic term details.");
      return;
    }

    const finalPosition = officePosition === "Other" ? customPosition.trim() || "Administrator" : officePosition;

    initializeMutation.mutate({
      adminFirstName: firstName.trim(),
      adminLastName: lastName.trim(),
      adminPosition: finalPosition,
      adminEmail: email.trim(),
      adminPhone: phone.trim() || undefined,
      adminPassword: password,
      otpCode: otpDigits.join(""),
      termName: termName.trim(),
      termStartDate: new Date(startDate),
      termEndDate: new Date(endDate),
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : undefined,
    });
  };

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Checking portal status...</p>
        </div>
      </div>
    );
  }

  // If already initialized
  if (setupStatus?.isSetupComplete) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900">Portal Already Configured</h2>
            <p className="text-xs text-slate-600">
              This SchoolFin deployment already has a registered proprietor account.
            </p>
          </div>
          <Link href="/login" className="block pt-2">
            <Button className="w-full py-3 font-bold rounded-2xl bg-[#1E257A] hover:bg-[#161B58] text-white">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* ================= LEFT PANE: FULL-BLEED IMAGE WITH BRANDING (100vh) ================= */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] h-full relative overflow-hidden select-none bg-slate-900 flex-col justify-between p-10 xl:p-14">
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

      {/* ================= RIGHT PANE: SETUP FORM AREA (100vh) ================= */}
      <div className="w-full lg:w-[58%] xl:w-[55%] h-full flex flex-col justify-between p-5 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto lg:overflow-hidden bg-white">
        {/* Top Header / Progress Indicator */}
        <div className="w-full max-w-md mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1E257A]">
              <Sparkles className="w-4 h-4 text-[#2B35AF]" />
              <span>Portal Setup Wizard</span>
            </div>
            <span className="text-xs font-bold text-slate-400">Step {step} of 3</span>
          </div>

          {/* Clean Step Bars */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? "bg-[#1E257A]" : "bg-slate-100"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? "bg-[#1E257A]" : "bg-slate-100"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? "bg-[#1E257A]" : "bg-slate-100"}`} />
          </div>
        </div>

        {/* Center Dynamic Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-2">
          {/* STEP 1: Admin Details */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Create Admin Account
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Enter your details to create the primary manager account for your school.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-900 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Your Role at the School *</label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={officePosition}
                    onChange={(e) => setOfficePosition(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all cursor-pointer"
                  >
                    {OFFICE_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {officePosition === "Other" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Position Title *</label>
                  <input
                    type="text"
                    required
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1E257A] rounded-xl text-xs sm:text-sm text-slate-900 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Work Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="accent"
                  isLoading={sendOtpMutation.isPending}
                  className="w-full py-3 text-xs sm:text-sm font-black rounded-xl bg-[#1E257A] hover:bg-[#161B58] text-white shadow-md shadow-[#1E257A]/15 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Send Verification Code <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: 6-Digit Email OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleStep2Verify} className="space-y-5">
              <div className="space-y-1">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-[#1E257A] mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Enter Verification Code
                </h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  We sent a 6-digit code to <strong className="text-slate-900">{email}</strong>. Enter it below to verify your email.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-900 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 6 Digit Input Group */}
              <div className="space-y-2 text-center py-2">
                <div className="flex justify-center items-center gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-slate-50 border-2 border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#1E257A] focus:ring-2 focus:ring-[#1E257A]/15 rounded-xl text-slate-900 outline-none transition-all"
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Code expires in 10 minutes. Don&apos;t see it? Check your spam folder.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-[#1E257A]">
                <span>Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || sendOtpMutation.isPending}
                  className="font-bold hover:underline disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sendOtpMutation.isPending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="py-2.5 px-4 text-xs font-bold rounded-xl border-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Edit Details
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  className="flex-1 py-3 text-xs sm:text-sm font-black rounded-xl bg-[#1E257A] hover:bg-[#161B58] text-white shadow-md shadow-[#1E257A]/15 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Verify & Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Academic Term Configuration & Portal Launch */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="space-y-1">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-[#1E257A] mb-2">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Current Academic Term
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Set up the active school term and fee payment deadline to get started.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-900 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Active Term Name *</label>
                <input
                  type="text"
                  required
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1E257A] focus:ring-2 focus:ring-[#1E257A]/10 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Term Starts *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1E257A] rounded-xl text-xs sm:text-sm text-slate-900 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Term Ends *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1E257A] rounded-xl text-xs sm:text-sm text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Fee Payment Due Date</label>
                <input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1E257A] rounded-xl text-xs sm:text-sm text-slate-900 outline-none"
                />
              </div>

              {/* Ready Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Ready to Launch:
                </div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Admin: <strong className="text-slate-800">{firstName} {lastName}</strong> ({officePosition === "Other" ? customPosition : officePosition}) • <span className="text-emerald-700 font-semibold">{email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="py-2.5 px-4 text-xs font-bold rounded-xl border-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  isLoading={initializeMutation.isPending || isSigningIn}
                  className="flex-1 py-3 text-xs sm:text-sm font-black rounded-xl bg-[#1E257A] hover:bg-[#161B58] text-white shadow-md shadow-[#1E257A]/15 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSigningIn ? "Opening Portal..." : "Complete Setup & Launch"} <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="w-full max-w-md mx-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/login" className="font-bold text-slate-600 hover:text-[#1E257A] transition-colors">
            Already finished setup? Sign In
          </Link>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted & Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
