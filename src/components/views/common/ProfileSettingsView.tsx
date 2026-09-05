"use client";

// src/components/views/common/ProfileSettingsView.tsx
// Profile and security settings view for Mrs. Oduwoye and school administrators

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { schoolConfig } from "../../../../school.config";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  User,
  Lock,
  Building,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Phone,
  Mail,
  KeyRound,
} from "lucide-react";

export function ProfileSettingsView() {
  const { data: session, update: updateSession } = useSession();
  const utils = trpc.useUtils();
  const { data: meData, isLoading: isMeLoading } = trpc.auth.me.useQuery();

  // Personal Info Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (meData) {
      setFirstName(meData.firstName || "");
      setLastName(meData.lastName || "");
      setPhone(meData.phone || "");
    } else if (session?.user) {
      setFirstName(session.user.firstName || "");
      setLastName(session.user.lastName || "");
    }
  }, [meData, session]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async (data) => {
      setProfileSuccess("Your profile details have been updated successfully.");
      setProfileError(null);
      setFirstName(data.firstName);
      setLastName(data.lastName);
      if (data.phone) setPhone(data.phone);
      
      await utils.auth.me.invalidate();

      if (updateSession) {
        await updateSession({
          user: {
            ...session?.user,
            firstName: data.firstName,
            lastName: data.lastName,
          },
        });
      }
    },
    onError: (err) => {
      setProfileError(err.message);
      setProfileSuccess(null);
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setPasswordSuccess("Your password has been changed successfully.");
      setPasswordError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      setPasswordError(err.message);
      setPasswordSuccess(null);
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    updateProfileMutation.mutate({
      firstName,
      lastName,
      phone: phone || undefined,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match. Please re-type.");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Administrator Profile & Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account credentials, personal information, and school administrative configuration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Information & Password Change */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Details Card */}
          <Card className="shadow-xs">
            <form onSubmit={handleProfileSubmit}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF1FF] text-[#2B35AF] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Personal Information</CardTitle>
                    <CardDescription className="text-xs">
                      Update your administrator title and contact details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {profileSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Title / First Name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Mrs."
                  />
                  <Input
                    label="Last Name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Oduwoye"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Official Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={session?.user?.email || ""}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400">
                    Email address is your primary authentication identifier and is managed by system security.
                  </p>
                </div>

                <Input
                  label="Contact Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                />
              </CardContent>

              <CardFooter className="flex justify-end">
                <Button
                  type="submit"
                  variant="accent"
                  isLoading={updateProfileMutation.isPending}
                  className="shadow-xs"
                >
                  Save Profile Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Password & Security Card */}
          <Card className="shadow-xs">
            <form onSubmit={handlePasswordSubmit}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Change Password</CardTitle>
                    <CardDescription className="text-xs">
                      Update your confidential portal access password
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <Input
                  label="Current Password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="New Password (min. 8 characters)"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={changePasswordMutation.isPending}
                >
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right Column: Account & Institution Badge Card */}
        <div className="space-y-6">
          <Card className="shadow-xs p-6 space-y-4">
            <div className="text-center space-y-2 pb-4 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-[#2B35AF] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-xs tracking-wider">
                PPS
              </div>
              <h3 className="font-bold text-base text-slate-900">
                {meData?.firstName || firstName || "Mrs."} {meData?.lastName || lastName || "Oduwoye"}
              </h3>
              <Badge variant="brand" className="text-xs px-3 py-1">
                {session?.user?.role || "PROPRIETOR"}
              </Badge>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Institution:</span>
                <span className="font-semibold text-slate-900 text-right">{schoolConfig.name}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Currency:</span>
                <span className="font-bold text-slate-900">{schoolConfig.currency} (Nigerian Naira)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Timezone:</span>
                <span className="font-semibold text-slate-900">{schoolConfig.timezone}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Domain:</span>
                <span className="font-mono text-[11px] text-slate-800">{schoolConfig.domain}</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#EEF1FF] border border-[#DBE1FF] rounded-xl text-xs text-[#2B35AF] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Super Admin Access</p>
                <p className="text-[11px] mt-0.5 text-slate-600">
                  You possess full supervisory privileges over staff accounts, fee structures, academic terms, and audit integrity logs.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
