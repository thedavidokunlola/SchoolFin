"use client";

// src/app/(bursar)/bursar/reports/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarReportsView } from "@/components/views/bursar/BursarReportsView";

export default function BursarReportsPage() {
  return (
    <DashboardLayout activeTab="reports">
      <BursarReportsView />
    </DashboardLayout>
  );
}
