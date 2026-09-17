"use client";

// src/components/views/accountant/AccountantOverviewView.tsx
// Accountant read-only financial overview (Rule SCOPE-4)

import React from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { CreditCard, FileText, ArrowRight, Receipt, TrendingUp, Calendar } from "lucide-react";

export interface AccountantOverviewViewProps {
  onNavigate?: (tab: string) => void;
}

export function AccountantOverviewView({ onNavigate }: AccountantOverviewViewProps) {
  const { data: metrics, isLoading } = trpc.dashboard.getMetrics.useQuery();
  const { data: terms } = trpc.terms.getAll.useQuery();

  const activeTerm = terms?.find((t) => t.isActive);

  const handleNav = (tab: string, e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(tab);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
              Accountant Financial Portal
            </h1>
            <Badge variant="warning" className="text-xs px-2.5 py-0.5">Read-Only</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <Calendar className="w-3.5 h-3.5 text-[#2B35AF]" />
            <span>Active Session: <strong className="text-slate-800 font-semibold">{activeTerm ? activeTerm.name : "None"}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/60">
            <span className={`w-2 h-2 rounded-full ${activeTerm ? "bg-emerald-500" : "bg-amber-500"}`} />
            {activeTerm ? "Session Active" : "No Active Term"}
          </div>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Invoiced - High Contrast Dark Hero Card */}
        <div className="rounded-2xl p-5 bg-[#12151E] text-white border border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-600/20 transition-all" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Invoiced / Posted
            </span>
            <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-slate-800 rounded-lg" />
            ) : (
              <span className="text-2xl font-black text-white block truncate">
                {Number(metrics?.totalPosted ?? 0).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Gross fee obligations</p>
          </div>
        </div>

        {/* Verified Revenue Collected */}
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
              {isLoading ? (
                <Skeleton className="h-8 w-32 rounded-lg" />
              ) : (
                <span className="text-2xl font-black text-emerald-700 block truncate">
                  {Number(metrics?.totalCollected ?? 0).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Cash receipts & payments</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Outstanding Receivables */}
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
              {isLoading ? (
                <Skeleton className="h-8 w-32 rounded-lg" />
              ) : (
                <span className="text-2xl font-black text-rose-600 block truncate">
                  {Number(metrics?.totalOutstanding ?? 0).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Uncollected receivables</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link
          href="/accountant/students"
          onClick={(e) => handleNav("students", e)}
          className="group"
        >
          <Card className="p-6 rounded-2xl border-slate-200/80 hover:border-[#2B35AF]/40 hover:shadow-xs transition-all shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-50 text-[#2B35AF] rounded-xl border border-blue-100">
                <FileText className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2B35AF] group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4 group-hover:text-[#2B35AF] transition-colors">
              Student Fee Ledgers
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Inspect audit-ready ledgers, fee postings, and receipt details for all students
            </p>
          </Card>
        </Link>

        <Link
          href="/accountant/reports"
          onClick={(e) => handleNav("reports", e)}
          className="group"
        >
          <Card className="p-6 rounded-2xl border-slate-200/80 hover:border-emerald-400 hover:shadow-xs transition-all shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <CreditCard className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4 group-hover:text-emerald-700 transition-colors">
              Tax & Financial Reconciliation
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              View financial summaries and fee structure allocations
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

