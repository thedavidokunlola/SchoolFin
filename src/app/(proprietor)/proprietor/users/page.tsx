"use client";

// src/app/(proprietor)/proprietor/users/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProprietorUsersView } from "@/components/views/proprietor/ProprietorUsersView";

export default function ProprietorUsersPage() {
  return (
    <DashboardLayout activeTab="users">
      <ProprietorUsersView />
    </DashboardLayout>
  );
}
