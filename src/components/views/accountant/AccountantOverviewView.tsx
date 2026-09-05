"use client";

// src/components/views/accountant/AccountantOverviewView.tsx
// Accountant read-only financial overview (Rule SCOPE-4)

import React from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreditCard, FileText, ArrowRight } from "lucide-react";

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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Accountant Financial Portal
          </h1>
          <Badge variant="warning">Read-Only Access</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Active Session: <strong className="text-slate-800 font-semibold">{activeTerm ? activeTerm.name : "None"}</strong>
        </p>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Invoiced / Posted
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
            <p className="text-[11px] text-slate-400 mt-1">Gross Fee Obligations</p>
          </div>
        </Card>

        <Card className="p-6 border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Verified Revenue Collected
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
            <p className="text-[11px] text-emerald-600/80 mt-1">Cash Receipts & Online Payments</p>
          </div>
        </Card>

        <Card className="p-6 border-rose-500/30 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
            Total Outstanding Receivables
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
            <p className="text-[11px] text-rose-600/80 mt-1">Pending student balances</p>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link
          href="/accountant/students"
          onClick={(e) => handleNav("students", e)}
          className="group"
        >
          <Card className="p-6 hover:border-slate-400 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4">
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
          <Card className="p-6 hover:border-slate-400 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-4">
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
