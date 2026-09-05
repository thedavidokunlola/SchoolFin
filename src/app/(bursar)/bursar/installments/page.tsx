"use client";

// src/app/(bursar)/bursar/installments/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarInstallmentsView } from "@/components/views/bursar/BursarInstallmentsView";

export default function BursarInstallmentsPage() {
  return (
    <DashboardLayout activeTab="installments">
      <BursarInstallmentsView />
    </DashboardLayout>
  );
}
