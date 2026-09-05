"use client";

// src/app/(parent)/parent/students/[id]/page.tsx
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ParentStatementView } from "@/components/views/parent/ParentStatementView";

export default function ParentStudentStatementPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  return (
    <DashboardLayout activeTab="overview">
      <ParentStatementView
        studentId={studentId}
        onBack={() => router.push("/parent/dashboard")}
        onPay={(id) => router.push(`/parent/pay/${id}`)}
        onInstallments={(id) => router.push(`/parent/installments/${id}`)}
      />
    </DashboardLayout>
  );
}
