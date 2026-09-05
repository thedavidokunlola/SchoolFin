"use client";

// src/app/(bursar)/bursar/receipts/[receiptNumber]/page.tsx
// Printable Official Receipt with react-to-print (Module D1 / Rule MONEY-10 / §6.9)

import React, { useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { trpc } from "@/lib/trpc/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CashReceiptTemplate } from "@/components/receipt/CashReceiptTemplate";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Printer, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

export default function BursarReceiptPage() {
  const params = useParams();
  const receiptNumber = (params.receiptNumber as string) || "";
  const componentRef = useRef<HTMLDivElement>(null);

  const { data: receipt, isLoading, error } = trpc.manualCredits.getReceipt.useQuery(
    { receiptNumber },
  );

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Receipt-${receiptNumber}`,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/bursar/students"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Students
          </Link>

          {receipt && (
            <div className="flex items-center gap-3">
              <Button
                variant="accent"
                size="md"
                onClick={() => handlePrint()}
                className="gap-2 shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" /> Print Official A5 Receipt
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading receipt data...
          </div>
        ) : error || !receipt ? (
          <div className="p-12 text-center text-xs text-rose-500">
            Receipt not found.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Official Receipt generated successfully (Sequential ID:{" "}
                  <strong>{receipt.receiptNumber}</strong>)
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700">
                Tamper-proof record
              </span>
            </div>

            {/* Receipt Preview Canvas */}
            <div className="border border-slate-300 rounded-2xl p-6 bg-slate-200/50 flex justify-center overflow-x-auto shadow-inner">
              <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-slate-300">
                <CashReceiptTemplate
                  ref={componentRef}
                  data={{
                    receiptNumber: receipt.receiptNumber,
                    issuedAt: receipt.issuedAt,
                    method: receipt.method,
                    amount: receipt.amount.toString(),
                    student: receipt.student,
                    manualCredit: receipt.manualCredit,
                    payment: receipt.payment,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
