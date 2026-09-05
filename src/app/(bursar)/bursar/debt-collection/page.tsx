"use client";

// src/app/(bursar)/bursar/debt-collection/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarDebtCollectionView } from "@/components/views/bursar/BursarDebtCollectionView";

export default function DebtCollectionConfigPage() {
  return (
    <DashboardLayout activeTab="debt-collection">
      <BursarDebtCollectionView />
    </DashboardLayout>
  );
}
