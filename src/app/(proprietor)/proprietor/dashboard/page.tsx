"use client";

// src/app/(proprietor)/proprietor/dashboard/page.tsx
// Proprietor Single-Page Portal Hub with conditional view rendering & instant tab navigation

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProprietorOverviewView } from "@/components/views/proprietor/ProprietorOverviewView";
import { ProprietorUsersView } from "@/components/views/proprietor/ProprietorUsersView";
import { ProprietorTermsView } from "@/components/views/proprietor/ProprietorTermsView";
import { ProprietorAuditLogView } from "@/components/views/proprietor/ProprietorAuditLogView";
import { ProprietorComplianceView } from "@/components/views/proprietor/ProprietorComplianceView";
import { ProfileSettingsView } from "@/components/views/common/ProfileSettingsView";

export type ProprietorTab =
  | "overview"
  | "users"
  | "terms"
  | "audit-log"
  | "compliance"
  | "profile";

function ProprietorPortalContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as ProprietorTab) || "overview";
  const [activeTab, setActiveTab] = useState<ProprietorTab>(initialTab);

  useEffect(() => {
    const currentTab = (searchParams.get("tab") as ProprietorTab) || "overview";
    setActiveTab(currentTab);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    const validTab = tab as ProprietorTab;
    setActiveTab(validTab);
    const newUrl = validTab === "overview" ? "/proprietor/dashboard" : `/proprietor/dashboard?tab=${validTab}`;
    window.history.pushState(null, "", newUrl);
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === "overview" && <ProprietorOverviewView />}
      {activeTab === "users" && <ProprietorUsersView />}
      {activeTab === "terms" && <ProprietorTermsView />}
      {activeTab === "audit-log" && <ProprietorAuditLogView />}
      {activeTab === "compliance" && <ProprietorComplianceView />}
      {activeTab === "profile" && <ProfileSettingsView />}
    </DashboardLayout>
  );
}

export default function ProprietorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProprietorPortalContent />
    </Suspense>
  );
}
