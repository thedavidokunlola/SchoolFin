"use client";

// src/components/views/bursar/BursarOverviewView.tsx
// Bursar overview component with financial KPI metrics and quick navigation

import React from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  GraduationCap,
  Receipt,
  CreditCard,
  ArrowRight,
  Users,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";

export interface BursarOverviewViewProps {
  onNavigate?: (tab: string) => void;
}

export function BursarOverviewView({ onNavigate }: BursarOverviewViewProps) {
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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bursar Command Centre
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active Term:{" "}
            <strong className="text-slate-800 font-semibold">
              {activeTerm ? activeTerm.name : "No Active Term Set"}
            </strong>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <Link href="/bursar/cash/record" onClick={(e) => handleNav("cash", e)}>
            <Button variant="accent" size="sm" className="gap-2 shadow-xs">
              <Receipt className="w-4 h-4" /> Record Cash Payment
            </Button>
          </Link>
          <Link href="/bursar/fees/post" onClick={(e) => handleNav("post", e)}>
            <Button variant="primary" size="sm" className="gap-2">
              <CreditCard className="w-4 h-4" /> Post Fees
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Fees Posted This Term
          </span>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              {isLoading
                ? "..."
                : Number(metrics?.totalPosted ?? 0).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Across all classes</p>
          </div>
        </Card>

        <Card className="p-6 border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Total Cash & Online Collected
          </span>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-700">
              {isLoading
                ? "..."
                : Number(metrics?.totalCollected ?? 0).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
            </span>
            <p className="text-[11px] text-emerald-600/80 mt-1">Verified and credited</p>
          </div>
        </Card>

        <Card className="p-6 border-rose-500/30 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
            Total Outstanding Balance
          </span>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-700">
              {isLoading
                ? "..."
                : Number(metrics?.totalOutstanding ?? 0).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
            </span>
            <p className="text-[11px] text-rose-600/80 mt-1">Unpaid student fees</p>
          </div>
        </Card>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/bursar/students"
          onClick={(e) => handleNav("students", e)}
          className="group"
        >
          <Card className="p-6 hover:border-slate-400 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4">
              Student Fee Accounts
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              View student ledgers, link parent accounts, and view payment histories
            </p>
          </Card>
        </Link>

        <Link
          href="/bursar/debtors"
          onClick={(e) => handleNav("debtors", e)}
          className="group"
        >
          <Card className="p-6 hover:border-slate-400 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4">
              Debtor List & Reminders
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Server-side filtered debtor tracking and bulk reminder dispatch
            </p>
          </Card>
        </Link>

        <Link
          href="/bursar/fees/structures"
          onClick={(e) => handleNav("fees", e)}
          className="group"
        >
          <Card className="p-6 hover:border-slate-400 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4">
              Fee Structure Manager
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure itemized fee structures per class and term
            </p>
          </Card>
        </Link>

        <Link
          href="/bursar/cash/record"
          onClick={(e) => handleNav("cash", e)}
          className="group"
        >
          <Card className="p-6 hover:border-slate-400 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
                <Receipt className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4">
              Record Cash & Print
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Record cash credits and immediately print official A5 receipts with QR codes
            </p>
          </Card>
        </Link>

        <Link
          href="/bursar/debt-collection"
          onClick={(e) => handleNav("debt-collection", e)}
          className="group"
        >
          <Card className="p-6 hover:border-slate-400 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4">
              Debt Collection Engine
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure multi-stage automated email/SMS reminder schedules and message templates
            </p>
          </Card>
        </Link>

        <Link
          href="/bursar/reports"
          onClick={(e) => handleNav("reports", e)}
          className="group"
        >
          <Card className="p-6 hover:border-slate-400 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4">
              Financial Income Reports
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Analyze class-by-class revenue breakdown, billing obligations, and SMS quota
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
