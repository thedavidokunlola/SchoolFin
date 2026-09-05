"use client";

// src/components/views/accountant/AccountantReportsView.tsx
// Financial Reports & Tax Audit Export page for Accountant (Module I1, I2 / Rule PERF-2)

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download, FileSpreadsheet, AlertCircle } from "lucide-react";

export function AccountantReportsView() {
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const { data: terms } = trpc.terms.getAll.useQuery();
  const activeTerm = terms?.find((t) => t.isActive);

  const termIdToQuery = selectedTermId || activeTerm?.id;

  const { data: report } = trpc.reports.getIncome.useQuery({
    termId: termIdToQuery,
  });

  const handleDownloadTaxAudit = async () => {
    setIsExporting(true);
    setExportNotice(null);

    try {
      const params = new URLSearchParams();
      if (termIdToQuery) params.set("termId", termIdToQuery);

      const res = await fetch(`/api/reports/tax-audit?${params.toString()}`);

      if (res.status === 202) {
        // Deferred handoff response (Rule PERF-2 / §I2-AC8)
        const data = await res.json();
        setExportNotice(data.message || "Your export is taking longer than expected. We will email it to you within 5 minutes.");
      } else if (res.ok) {
        const blob = await res.blob();
        const contentDisposition = res.headers.get("Content-Disposition");
        let filename = "TaxAuditReport.xlsx";
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) filename = match[1];
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        setExportNotice("Failed to generate tax audit export. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setExportNotice("An unexpected error occurred during export generation.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDebtorList = () => {
    const params = new URLSearchParams();
    if (termIdToQuery) params.set("termId", termIdToQuery);
    window.open(`/api/reports/debtors?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tax Audit & Financial Statements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Read-only ledger summaries, class breakdown allocations, and 3-sheet Tax Auditor exports (Module I1, I2).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleDownloadDebtorList}
            className="gap-2 text-xs"
          >
            <Download className="w-4 h-4" /> Debtor List Excel
          </Button>
          <Button
            variant="accent"
            size="md"
            onClick={handleDownloadTaxAudit}
            isLoading={isExporting}
            className="gap-2 text-xs shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" /> Generate Tax Audit (.xlsx)
          </Button>
        </div>
      </div>

      {/* Deferred Timeout Notification Banner (Rule PERF-2 / §I2-AC8) */}
      {exportNotice && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Export Processing Notice</p>
            <p className="mt-0.5">{exportNotice}</p>
          </div>
        </div>
      )}

      {/* Term Selector */}
      <Card className="p-4 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="w-72">
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

          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
              Session Recovery Rate
            </span>
            <span className="text-2xl font-black text-slate-900">
              {report?.collectionRate ?? 100}%
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
