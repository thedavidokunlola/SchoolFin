"use client";

// src/app/(accountant)/accountant/reports/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccountantReportsView } from "@/components/views/accountant/AccountantReportsView";

export default function AccountantReportsPage() {
  return (
    <DashboardLayout activeTab="reports">
      <AccountantReportsView />
    </DashboardLayout>
  );
}
