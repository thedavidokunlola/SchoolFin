"use client";

// src/app/(parent)/parent/pay/[studentId]/page.tsx
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ParentPayView } from "@/components/views/parent/ParentPayView";

export default function ParentOnlinePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  return (
    <DashboardLayout activeTab="overview">
      <ParentPayView
        studentId={studentId}
        onBack={() => router.push(`/parent/students/${studentId}`)}
        onPaymentSuccess={() => router.push(`/parent/students/${studentId}`)}
      />
    </DashboardLayout>
  );
}
