"use client";

// src/components/views/bursar/BursarReportsView.tsx
// School Income analytics, class collection rates, and SMS Cap progress widget (Module I1, PRD §7.2)

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SCHOOL_CLASSES } from "@/lib/constants";
import {
  Download,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";

export function BursarReportsView() {
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");

  const { data: terms } = trpc.terms.getAll.useQuery();
  const activeTerm = terms?.find((t) => t.isActive);

  const termIdToQuery = selectedTermId || activeTerm?.id;

  const { data: report, isLoading: isReportLoading } = trpc.reports.getIncome.useQuery({
    termId: termIdToQuery,
    class: selectedClass || undefined,
  });

  const { data: smsStats } = trpc.reports.getSmsCapStats.useQuery();

  const handleDownloadTaxAudit = () => {
    const params = new URLSearchParams();
    if (termIdToQuery) params.set("termId", termIdToQuery);
    window.open(`/api/reports/tax-audit?${params.toString()}`, "_blank");
  };

  const handleDownloadDebtorList = () => {
    const params = new URLSearchParams();
    if (termIdToQuery) params.set("termId", termIdToQuery);
    if (selectedClass) params.set("class", selectedClass);
    window.open(`/api/reports/debtors?${params.toString()}`, "_blank");
  };

  const smsUsagePercent = smsStats ? Math.min(100, Math.round(smsStats.usageRatio * 100)) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            School Income & Financial Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyze fee collections, class recovery performance, and export tax statements (Module I1).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="md"
            onClick={handleDownloadDebtorList}
            className="w-full sm:w-auto gap-2 text-xs"
          >
            <Download className="w-4 h-4" /> Debtor List Excel
          </Button>
          <Button
            variant="accent"
            size="md"
            onClick={handleDownloadTaxAudit}
            className="w-full sm:w-auto gap-2 text-xs shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" /> Tax Audit Excel Export
          </Button>
        </div>
      </div>

      {/* SMS Cap Widget (PRD §7.2 / Rule NOTIF-3) */}
      {smsStats && (
        <Card
          className={`p-4 border shadow-xs ${
            smsStats.isPaused
              ? "bg-rose-50 border-rose-300"
              : smsStats.usageRatio >= 0.8
                ? "bg-amber-50 border-amber-300"
                : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  smsStats.isPaused
                    ? "bg-rose-100 text-rose-700"
                    : smsStats.usageRatio >= 0.8
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  Monthly Automated SMS Cap Status
                  {smsStats.isPaused ? (
                    <Badge variant="danger">PAUSED (100% CAP REACHED)</Badge>
                  ) : smsStats.usageRatio >= 0.8 ? (
                    <Badge variant="warning">WARNING (80% USAGE)</Badge>
                  ) : (
                    <Badge variant="success">HEALTHY</Badge>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {smsStats.sentCount} / {smsStats.cap} monthly SMS units utilized this calendar month.
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full sm:w-64 space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>Quota Usage</span>
                <span>{smsUsagePercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    smsStats.isPaused
                      ? "bg-rose-600"
                      : smsStats.usageRatio >= 0.8
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                  }`}
                  style={{ width: `${smsUsagePercent}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filter Controls */}
      <Card className="p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Select Academic Term
            </label>
            <select
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              value={termIdToQuery || ""}
              onChange={(e) => setSelectedTermId(e.target.value)}
            >
              {terms?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Filter by Class (Optional)
            </label>
            <select
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {SCHOOL_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-slate-400 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Total Fee Obligations</span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {report
              ? Number(report.totalBilled).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })
              : "₦0.00"}
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-600 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Total Revenue Collected</span>
          <p className="text-xl font-black text-emerald-700 mt-1">
            {report
              ? Number(report.totalCollected).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })
              : "₦0.00"}
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-rose-500 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Outstanding Receivables</span>
          <p className="text-xl font-black text-rose-600 mt-1">
            {report
              ? Number(report.totalOutstanding).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })
              : "₦0.00"}
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-brand-500 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Collection Recovery Rate</span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {report?.collectionRate ?? 100}%
          </p>
        </Card>
      </div>

      {/* Class Breakdown Table */}
      <Card className="shadow-xs">
        <CardHeader className="py-4 px-6 border-b border-slate-100">
          <CardTitle className="text-sm">Class Revenue Performance Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Recovery rates categorized by academic level
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Class</th>
                <th className="p-4">Billed Amount (NGN)</th>
                <th className="p-4">Collected (NGN)</th>
                <th className="p-4">Outstanding (NGN)</th>
                <th className="p-4 text-right">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isReportLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading financial report...
                  </td>
                </tr>
              ) : report?.classBreakdowns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No posted fee structures for this academic term.
                  </td>
                </tr>
              ) : (
                report?.classBreakdowns.map((cls) => (
                  <tr key={cls.className} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{cls.className}</td>
                    <td className="p-4 font-mono font-medium text-slate-700">
                      {Number(cls.billed).toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-700">
                      {Number(cls.collected).toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </td>
                    <td className="p-4 font-mono font-bold text-rose-600">
                      {Number(cls.outstanding).toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`font-black ${
                          cls.collectionRate >= 80
                            ? "text-emerald-700"
                            : cls.collectionRate >= 50
                              ? "text-amber-700"
                              : "text-rose-600"
                        }`}
                      >
                        {cls.collectionRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
