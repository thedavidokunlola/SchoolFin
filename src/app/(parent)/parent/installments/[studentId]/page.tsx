"use client";

// src/app/(parent)/parent/installments/[studentId]/page.tsx
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ParentInstallmentsView } from "@/components/views/parent/ParentInstallmentsView";

export default function ParentInstallmentsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  return (
    <DashboardLayout activeTab="overview">
      <ParentInstallmentsView
        studentId={studentId}
        onBack={() => router.push(`/parent/students/${studentId}`)}
        onPlanSelected={() => router.push(`/parent/pay/${studentId}`)}
      />
    </DashboardLayout>
  );
}
