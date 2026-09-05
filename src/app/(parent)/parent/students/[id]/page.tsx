"use client";

// src/app/(parent)/parent/students/[id]/page.tsx
import React, { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ParentStatementView } from "@/components/views/parent/ParentStatementView";

export default function ParentStudentStatementPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  return (
    <DashboardLayout activeTab="overview">
      <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading student statement...</div>}>
        <ParentStatementView
          studentId={studentId}
          onBack={() => router.push("/parent/dashboard")}
          onPay={(id) => router.push(`/parent/pay/${id}`)}
          onInstallments={(id) => router.push(`/parent/installments/${id}`)}
        />
      </Suspense>
    </DashboardLayout>
  );
}
