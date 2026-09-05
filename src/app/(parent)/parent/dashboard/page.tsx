"use client";

// src/app/(parent)/parent/dashboard/page.tsx
// Parent Single-Page Portal Hub with instant view switching between Children, Statements, Online Payment, and Installments

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ParentOverviewView } from "@/components/views/parent/ParentOverviewView";
import { ParentStatementView } from "@/components/views/parent/ParentStatementView";
import { ParentPayView } from "@/components/views/parent/ParentPayView";
import { ParentInstallmentsView } from "@/components/views/parent/ParentInstallmentsView";

export type ParentTab = "overview" | "statement" | "pay" | "installments";

function ParentPortalContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as ParentTab) || "overview";
  const initialStudentId = searchParams.get("studentId") || "";

  const [activeTab, setActiveTab] = useState<ParentTab>(initialTab);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);

  useEffect(() => {
    const currentTab = (searchParams.get("tab") as ParentTab) || "overview";
    const currentStudentId = searchParams.get("studentId") || "";
    setActiveTab(currentTab);
    if (currentStudentId) setSelectedStudentId(currentStudentId);
  }, [searchParams]);

  const handleTabChange = (tab: ParentTab, studentId?: string) => {
    setActiveTab(tab);
    if (studentId) setSelectedStudentId(studentId);

    const targetStudentId = studentId || selectedStudentId;
    let newUrl = "/parent/dashboard";
    if (tab !== "overview") {
      newUrl = targetStudentId
        ? `/parent/dashboard?tab=${tab}&studentId=${targetStudentId}`
        : `/parent/dashboard?tab=${tab}`;
    }
    window.history.pushState(null, "", newUrl);
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={(tab) => handleTabChange(tab as ParentTab)}>
      {activeTab === "overview" && (
        <ParentOverviewView
          onSelectStudent={(studentId) => handleTabChange("statement", studentId)}
        />
      )}
      {activeTab === "statement" && selectedStudentId && (
        <ParentStatementView
          studentId={selectedStudentId}
          onBack={() => handleTabChange("overview")}
          onPay={(studentId) => handleTabChange("pay", studentId)}
          onInstallments={(studentId) => handleTabChange("installments", studentId)}
        />
      )}
      {activeTab === "pay" && selectedStudentId && (
        <ParentPayView
          studentId={selectedStudentId}
          onBack={() => handleTabChange("statement", selectedStudentId)}
          onPaymentSuccess={() => handleTabChange("statement", selectedStudentId)}
        />
      )}
      {activeTab === "installments" && selectedStudentId && (
        <ParentInstallmentsView
          studentId={selectedStudentId}
          onBack={() => handleTabChange("statement", selectedStudentId)}
          onPlanSelected={() => handleTabChange("pay", selectedStudentId)}
        />
      )}
    </DashboardLayout>
  );
}

export default function ParentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ParentPortalContent />
    </Suspense>
  );
}
