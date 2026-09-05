"use client";

// src/app/(bursar)/bursar/fees/post/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BursarFeePostView } from "@/components/views/bursar/BursarFeePostView";

export default function BursarFeePostPage() {
  return (
    <DashboardLayout activeTab="post">
      <BursarFeePostView />
    </DashboardLayout>
  );
}
