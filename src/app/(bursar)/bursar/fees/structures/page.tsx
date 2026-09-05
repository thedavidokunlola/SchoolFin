"use client";

// src/app/(bursar)/bursar/fees/structures/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarFeeStructuresView } from "@/components/views/bursar/BursarFeeStructuresView";

export default function BursarFeeStructuresPage() {
  return (
    <DashboardLayout activeTab="fees">
      <BursarFeeStructuresView />
    </DashboardLayout>
  );
}
