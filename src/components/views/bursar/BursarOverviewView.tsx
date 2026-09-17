"use client";

// src/components/views/bursar/BursarOverviewView.tsx
// Operational Bursar Command Centre with live financial metrics, collection progress, and activity feeds

import React from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Users,
  CreditCard,
  Receipt,
  TrendingUp,
  Clock,
  Calendar,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

export interface BursarOverviewViewProps {
  onNavigate?: (tab: string) => void;
}

export function BursarOverviewView({ onNavigate }: BursarOverviewViewProps) {
  const { data: metrics, isLoading: isLoadingMetrics } = trpc.dashboard.getMetrics.useQuery();
  const { data: terms } = trpc.terms.getAll.useQuery();
  const activeTerm = terms?.find((t) => t.isActive);

  const { data: incomeData } = trpc.reports.getIncome.useQuery(
    { termId: activeTerm?.id },
    { enabled: !!activeTerm?.id },
  );

  const totalPosted = Number(metrics?.totalPosted ?? 0);
  const totalCollected = Number(metrics?.totalCollected ?? 0);
  const totalOutstanding = Number(metrics?.totalOutstanding ?? 0);
  const collectionRate = totalPosted > 0 ? Math.min(100, Math.round((totalCollected / totalPosted) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
              Bursar Financial Operations
            </h1>
          </div>
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
            {activeTerm ? "Active Academic Term" : "Term Inactive"}
          </div>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced - High Contrast Dark Hero Card */}
        <div className="rounded-2xl p-5 bg-[#12151E] text-white border border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-600/20 transition-all" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Invoiced
            </span>
            <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-2xl font-black tracking-tight text-white block truncate">
              {isLoadingMetrics
                ? "..."
                : totalPosted.toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Active term fee charges</p>
          </div>
        </div>

        {/* Total Collected */}
        <Card className="shadow-2xs border-slate-200/80 hover:border-slate-300 transition-colors rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Verified Collections
              </span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-emerald-700 block truncate">
                {isLoadingMetrics
                  ? "..."
                  : totalCollected.toLocaleString("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    })}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Cash receipts & payments</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Outstanding */}
        <Card className="shadow-2xs border-slate-200/80 hover:border-slate-300 transition-colors rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-rose-600 block truncate">
                {isLoadingMetrics
                  ? "..."
                  : totalOutstanding.toLocaleString("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    })}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Uncollected student debt</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Students Headcount */}
        <Card className="shadow-2xs border-slate-200/80 hover:border-slate-300 transition-colors rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Enrolled Students
              </span>
              <div className="p-2.5 bg-blue-50 text-[#2B35AF] rounded-xl border border-blue-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-900 block">
                {isLoadingMetrics ? "..." : metrics?.activeStudentsCount ?? 0}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Active student accounts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Overall Collection Progress & Class Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Overall Collection Health Widget */}
        <Card className="lg:col-span-1 shadow-2xs border-slate-200/80 rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <ShieldCheck className="w-4 h-4 text-[#2B35AF]" />
              Collection Recovery Rate
            </CardTitle>
            <CardDescription className="text-xs">
              Recovery progress towards full term billing
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-black text-slate-900">{collectionRate}%</span>
                <span className="text-xs font-semibold text-slate-500">
                  {totalCollected.toLocaleString("en-NG", { style: "currency", currency: "NGN" })} /{" "}
                  {totalPosted.toLocaleString("en-NG", { style: "currency", currency: "NGN" })}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Invoiced</span>
                <strong className="text-slate-900 font-semibold">
                  ₦{totalPosted.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Total Collected</span>
                <strong>₦{totalCollected.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-rose-600 font-medium pt-1.5 border-t border-slate-200/60">
                <span>Remaining to Recover</span>
                <strong>₦{totalOutstanding.toLocaleString()}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Class-by-Class Recovery Breakdown */}
        <Card className="lg:col-span-2 shadow-2xs border-slate-200/80 rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Class Collection Performance</CardTitle>
                <CardDescription className="text-xs">
                  Fee recovery progress broken down by class
                </CardDescription>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("reports")}
                  className="text-xs text-[#2B35AF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Full Report <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(!incomeData?.classBreakdowns || incomeData.classBreakdowns.length === 0) ? (
              <div className="p-4">
                <EmptyState
                  icon={<GraduationCap className="w-5 h-5 text-indigo-600" />}
                  title="No Class Performance Data"
                  description="Fee collection rates and outstanding balances will appear here as soon as fee structures are posted to classes."
                  actionLabel={onNavigate ? "Post Fees to Class" : undefined}
                  onAction={onNavigate ? () => onNavigate("posting") : undefined}
                  compact
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
                {incomeData.classBreakdowns.map((cb) => {
                  const rate = Math.round(cb.collectionRate);
                  return (
                    <div key={cb.className} className="p-3.5 px-6 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                      <div className="w-32 shrink-0">
                        <p className="text-xs font-bold text-slate-900">{cb.className}</p>
                      </div>

                      <div className="flex-1 max-w-xs space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">{rate}%</span>
                          <span className="text-slate-400">
                            ₦{Number(cb.collected).toLocaleString()} / ₦{Number(cb.billed).toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rate >= 75 ? "bg-emerald-600" : rate >= 40 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900">
                          ₦{Number(cb.outstanding).toLocaleString()}
                        </p>
                        <span className="text-[10px] text-slate-400">outstanding</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Cash Receipts & Recent Fee Postings Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Cash Payments Feed */}
        <Card className="shadow-2xs border-slate-200/80 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Recent Cash Receipts
              </CardTitle>
              <CardDescription className="text-xs">
                Latest manual payments recorded at bursary
              </CardDescription>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("cash")}
                className="text-xs text-[#2B35AF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                View Cash Log <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(!metrics?.recentCredits || metrics.recentCredits.length === 0) ? (
                <div className="p-4">
                  <EmptyState
                    icon={<Receipt className="w-5 h-5 text-emerald-600" />}
                    title="No Cash Receipts Yet"
                    description="Manual cash fee credits recorded by the bursar with official sequentially generated receipts will appear here."
                    actionLabel={onNavigate ? "Record Cash Payment" : undefined}
                    onAction={onNavigate ? () => onNavigate("cash") : undefined}
                    compact
                  />
                </div>
              ) : (
                metrics.recentCredits.map((credit) => (
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
                          {credit.student.class} • Receipt:{" "}
                          <span className="font-mono font-medium text-slate-700">
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

        {/* Recent Fee Postings Feed */}
        <Card className="shadow-2xs border-slate-200/80 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <TrendingUp className="w-4 h-4 text-[#2B35AF]" />
                Recent Fee Postings
              </CardTitle>
              <CardDescription className="text-xs">
                Termly charge obligations applied
              </CardDescription>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("posting")}
                className="text-xs text-[#2B35AF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                Post New Fees <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(!metrics?.recentPostings || metrics.recentPostings.length === 0) ? (
                <div className="p-4">
                  <EmptyState
                    icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
                    title="No Fee Postings Recorded"
                    description="Fee structure commitments posted to classes or individual student ledgers will be listed here in real time."
                    actionLabel={onNavigate ? "Post Fees Now" : undefined}
                    onAction={onNavigate ? () => onNavigate("posting") : undefined}
                    compact
                  />
                </div>
              ) : (
                metrics.recentPostings.map((posting) => (
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
                          {posting.student.class} • {posting.feeStructure.name}
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

