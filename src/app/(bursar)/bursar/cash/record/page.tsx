"use client";

// src/app/(bursar)/bursar/cash/record/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarCashRecordView } from "@/components/views/bursar/BursarCashRecordView";

export default function RecordCashPaymentPage() {
  return (
    <DashboardLayout activeTab="cash">
      <BursarCashRecordView />
    </DashboardLayout>
  );
}
