"use client";

// src/app/(bursar)/bursar/dashboard/page.tsx
// Bursar Single-Page Portal Hub with instant conditional view rendering & URL sync

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarOverviewView } from "@/components/views/bursar/BursarOverviewView";
import { BursarStudentsView } from "@/components/views/bursar/BursarStudentsView";
import { BursarDebtorsView } from "@/components/views/bursar/BursarDebtorsView";
import { BursarFeeStructuresView } from "@/components/views/bursar/BursarFeeStructuresView";
import { BursarFeePostView } from "@/components/views/bursar/BursarFeePostView";
import { BursarInstallmentsView } from "@/components/views/bursar/BursarInstallmentsView";
import { BursarCashRecordView } from "@/components/views/bursar/BursarCashRecordView";
import { BursarDebtCollectionView } from "@/components/views/bursar/BursarDebtCollectionView";
import { BursarReportsView } from "@/components/views/bursar/BursarReportsView";

export type BursarTab =
  | "overview"
  | "students"
  | "debtors"
  | "fees"
  | "post"
  | "installments"
  | "cash"
  | "debt-collection"
  | "reports";

function BursarPortalContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as BursarTab) || "overview";
  const [activeTab, setActiveTab] = useState<BursarTab>(initialTab);

  useEffect(() => {
    const currentTab = (searchParams.get("tab") as BursarTab) || "overview";
    setActiveTab(currentTab);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    const validTab = tab as BursarTab;
    setActiveTab(validTab);
    const newUrl = validTab === "overview" ? "/bursar/dashboard" : `/bursar/dashboard?tab=${validTab}`;
    window.history.pushState(null, "", newUrl);
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === "overview" && <BursarOverviewView onNavigate={handleTabChange} />}
      {activeTab === "students" && <BursarStudentsView />}
      {activeTab === "debtors" && <BursarDebtorsView />}
      {activeTab === "fees" && <BursarFeeStructuresView />}
      {activeTab === "post" && <BursarFeePostView onNavigate={handleTabChange} />}
      {activeTab === "installments" && <BursarInstallmentsView />}
      {activeTab === "cash" && <BursarCashRecordView />}
      {activeTab === "debt-collection" && <BursarDebtCollectionView />}
      {activeTab === "reports" && <BursarReportsView />}
    </DashboardLayout>
  );
}

export default function BursarDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BursarPortalContent />
    </Suspense>
  );
}
