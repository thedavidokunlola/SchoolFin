"use client";

// src/app/(proprietor)/proprietor/terms/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProprietorTermsView } from "@/components/views/proprietor/ProprietorTermsView";

export default function ProprietorTermsPage() {
  return (
    <DashboardLayout activeTab="terms">
      <ProprietorTermsView />
    </DashboardLayout>
  );
}
