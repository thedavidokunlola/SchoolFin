"use client";

// src/components/views/proprietor/ProprietorOverviewView.tsx
// Proprietor Overview component with financial KPI metrics and recent transactions

import React from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  Calendar,
  Clock,
} from "lucide-react";

export function ProprietorOverviewView() {
  const { data: metrics, isLoading } = trpc.dashboard.getMetrics.useQuery();
  const { data: terms } = trpc.terms.getAll.useQuery();

  const activeTerm = terms?.find((t) => t.isActive);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Proprietor Executive Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#2B35AF]" />
              {activeTerm ? activeTerm.name : "No Active Academic Session"}
            </span>
            {activeTerm?.paymentDueDate && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Due Date:{" "}
                  {new Date(activeTerm.paymentDueDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/60">
            <span className={`w-2 h-2 rounded-full ${activeTerm ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {activeTerm ? "Academic Session Active" : "Term Inactive"}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fees Posted - High Contrast Dark Hero Card */}
        <div className="rounded-2xl p-5 bg-[#12151E] text-white border border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-600/20 transition-all" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Fees Posted
            </span>
            <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            {isLoading ? (
              <Skeleton className="h-8 w-28 bg-slate-800 mb-1" />
            ) : (
              <span className="text-2xl font-black text-white block truncate">
                {Number(metrics?.totalPosted ?? 0).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Net charges this term</p>
          </div>
        </div>

        {/* Total Collected */}
        <Card className="shadow-2xs border-slate-200/80 hover:border-slate-300 transition-colors rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Collected
              </span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              {isLoading ? (
                <Skeleton className="h-8 w-28 mb-1" />
              ) : (
                <span className="text-2xl font-black text-emerald-700 block truncate">
                  {Number(metrics?.totalCollected ?? 0).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Cash & online payments</p>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Debt */}
        <Card className="shadow-2xs border-slate-200/80 hover:border-slate-300 transition-colors rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Outstanding Debt
              </span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              {isLoading ? (
                <Skeleton className="h-8 w-28 mb-1" />
              ) : (
                <span className="text-2xl font-black text-rose-600 block truncate">
                  {Number(metrics?.totalOutstanding ?? 0).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Uncollected term balances</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Students */}
        <Card className="shadow-2xs border-slate-200/80 hover:border-slate-300 transition-colors rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Students
              </span>
              <div className="p-2.5 bg-blue-50 text-[#2B35AF] rounded-xl border border-blue-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <span className="text-2xl font-black text-slate-900 block">
                  {metrics?.activeStudentsCount ?? 0}
                </span>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Enrolled & active accounts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Two-Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Cash Payments */}
        <Card className="shadow-2xs border-slate-200/80 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Recent Cash Receipts
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
                    className="p-3.5 px-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-100">
                        {credit.student.firstName[0]}
                        {credit.student.lastName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {credit.student.firstName} {credit.student.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Class: {credit.student.class} • Receipt:{" "}
                          <span className="font-mono text-slate-700">
                            {credit.receipt?.receiptNumber}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">
                        +{Number(credit.amount).toLocaleString("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        })}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-600 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Completed</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Fee Postings */}
        <Card className="shadow-2xs border-slate-200/80 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <TrendingUp className="w-4 h-4 text-[#2B35AF]" />
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
                    className="p-3.5 px-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#2B35AF] font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                        {posting.student.firstName[0]}
                        {posting.student.lastName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {posting.student.firstName} {posting.student.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Structure: {posting.feeStructure.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {Number(posting.amount).toLocaleString("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        })}
                      </p>
                      <Badge
                        variant={posting.type === "CHARGE" ? "neutral" : "danger"}
                        className="text-[10px] mt-0.5"
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

