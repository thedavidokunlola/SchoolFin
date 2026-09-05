"use client";

// src/app/(proprietor)/proprietor/audit-log/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProprietorAuditLogView } from "@/components/views/proprietor/ProprietorAuditLogView";

export default function ProprietorAuditLogPage() {
  return (
    <DashboardLayout activeTab="audit-log">
      <ProprietorAuditLogView />
    </DashboardLayout>
  );
}
