"use client";

// src/app/(bursar)/bursar/debtors/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarDebtorsView } from "@/components/views/bursar/BursarDebtorsView";

export default function BursarDebtorsPage() {
  return (
    <DashboardLayout activeTab="debtors">
      <BursarDebtorsView />
    </DashboardLayout>
  );
}
