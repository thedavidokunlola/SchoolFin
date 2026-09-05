"use client";

// src/app/(bursar)/bursar/students/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarStudentsView } from "@/components/views/bursar/BursarStudentsView";

export default function BursarStudentsPage() {
  return (
    <DashboardLayout activeTab="students">
      <BursarStudentsView />
    </DashboardLayout>
  );
}
