"use client";

// src/app/(accountant)/accountant/students/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccountantStudentsView } from "@/components/views/accountant/AccountantStudentsView";

export default function AccountantStudentsPage() {
  return (
    <DashboardLayout activeTab="students">
      <AccountantStudentsView />
    </DashboardLayout>
  );
}
