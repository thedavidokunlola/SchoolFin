"use client";

// src/components/views/proprietor/ProprietorOverviewView.tsx
// Proprietor Overview component with financial KPI metrics and recent transactions

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SchoolOnboardingModal } from "@/components/common/SchoolOnboardingModal";
import {
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  Sparkles,
} from "lucide-react";

export function ProprietorOverviewView() {
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const shown = localStorage.getItem("schoolfin_onboarding_shown") === "true";
      if (!shown) {
        setIsOnboardingModalOpen(true);
      }
    }
  }, []);

  const { data: metrics, isLoading } = trpc.dashboard.getMetrics.useQuery();
  const { data: terms } = trpc.terms.getAll.useQuery();

  const activeTerm = terms?.find((t) => t.isActive);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Onboarding Interactive Modal */}
      <SchoolOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Proprietor Financial Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active Term:{" "}
            <strong className="text-slate-800 font-semibold">
              {activeTerm ? activeTerm.name : "No Active Term Set"}
            </strong>
            {activeTerm?.paymentDueDate && (
              <span>
                {" "}• Payment Due:{" "}
                {new Date(activeTerm.paymentDueDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOnboardingModalOpen(true)}
            className="text-xs gap-1.5 text-[#2B35AF] border-indigo-200 hover:bg-indigo-50 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" /> Setup Guide
          </Button>

          <Badge variant={activeTerm ? "success" : "warning"} className="px-3 py-1">
            {activeTerm ? "Academic Session Active" : "Term Setup Required"}
          </Badge>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-md transition-shadow shadow-xs">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Students
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">
                {isLoading ? "..." : metrics?.activeStudentsCount ?? 0}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">
                Enrolled & Active
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow shadow-xs">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Fees Posted
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-slate-900">
                {isLoading
                  ? "..."
                  : Number(metrics?.totalPosted ?? 0).toLocaleString("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    })}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">
                Net Charges this Term
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow shadow-xs">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Collected
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-emerald-700">
                {isLoading
                  ? "..."
                  : Number(metrics?.totalCollected ?? 0).toLocaleString("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    })}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">
                Cash & Online Payments
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow shadow-xs">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Outstanding Debt
              </span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-rose-600">
                {isLoading
                  ? "..."
                  : Number(metrics?.totalOutstanding ?? 0).toLocaleString("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    })}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1">
                Uncollected Term Balances
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Two-Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cash Payments */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-700" />
                Recent Cash Payments
              </CardTitle>
              <CardDescription className="text-xs">
                Recorded manual credits by bursar
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {metrics?.recentCredits?.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={<Receipt className="w-5 h-5 text-emerald-600" />}
                    title="No Cash Payments Recorded"
                    description="Manual cash payments and issued official receipts recorded by the bursary will appear here in real time."
                    compact
                  />
                </div>
              ) : (
                metrics?.recentCredits?.map((credit) => (
                  <div
                    key={credit.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {credit.student.firstName} {credit.student.lastName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Class: {credit.student.class} • Receipt:{" "}
                        <span className="font-mono text-slate-700">
                          {credit.receipt?.receiptNumber}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-700">
                        +{Number(credit.amount).toLocaleString("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        })}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(credit.recordedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Fee Postings */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Recent Fee Postings
              </CardTitle>
              <CardDescription className="text-xs">
                Individual and class postings
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {metrics?.recentPostings?.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
                    title="No Fee Postings Yet"
                    description="Fee schedules posted in bulk by class or individually to student ledgers will be listed here."
                    compact
                  />
                </div>
              ) : (
                metrics?.recentPostings?.map((posting) => (
                  <div
                    key={posting.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {posting.student.firstName} {posting.student.lastName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Structure: {posting.feeStructure.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">
                        {Number(posting.amount).toLocaleString("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        })}
                      </p>
                      <Badge
                        variant={posting.type === "CHARGE" ? "neutral" : "danger"}
                        className="text-[10px]"
                      >
                        {posting.type}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
