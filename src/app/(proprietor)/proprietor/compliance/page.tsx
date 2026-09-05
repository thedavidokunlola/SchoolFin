"use client";

// src/app/(proprietor)/proprietor/compliance/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProprietorComplianceView } from "@/components/views/proprietor/ProprietorComplianceView";

export default function ProprietorCompliancePage() {
  return (
    <DashboardLayout activeTab="compliance">
      <ProprietorComplianceView />
    </DashboardLayout>
  );
}
