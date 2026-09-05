"use client";

// src/app/(accountant)/accountant/dashboard/page.tsx
// Accountant Single-Page Portal Hub with conditional view rendering & instant tab navigation

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccountantOverviewView } from "@/components/views/accountant/AccountantOverviewView";
import { AccountantStudentsView } from "@/components/views/accountant/AccountantStudentsView";
import { AccountantReportsView } from "@/components/views/accountant/AccountantReportsView";

export type AccountantTab = "overview" | "students" | "reports";

function AccountantPortalContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as AccountantTab) || "overview";
  const [activeTab, setActiveTab] = useState<AccountantTab>(initialTab);

  useEffect(() => {
    const currentTab = (searchParams.get("tab") as AccountantTab) || "overview";
    setActiveTab(currentTab);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    const validTab = tab as AccountantTab;
    setActiveTab(validTab);
    const newUrl = validTab === "overview" ? "/accountant/dashboard" : `/accountant/dashboard?tab=${validTab}`;
    window.history.pushState(null, "", newUrl);
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === "overview" && <AccountantOverviewView onNavigate={handleTabChange} />}
      {activeTab === "students" && <AccountantStudentsView />}
      {activeTab === "reports" && <AccountantReportsView />}
    </DashboardLayout>
  );
}

export default function AccountantDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AccountantPortalContent />
    </Suspense>
  );
}
