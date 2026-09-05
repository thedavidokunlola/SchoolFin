"use client";

// src/app/verify/receipt/[receiptNumber]/page.tsx
// Public Receipt Verification Endpoint (Module L1 / Rule SEC-5)

import React from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, AlertCircle, Building, Calendar, CreditCard, User } from "lucide-react";

export default function VerifyReceiptPage() {
  const params = useParams();
  const receiptNumber = (params.receiptNumber as string) || "";

  const { data, isLoading, error } = trpc.receipts.verify.useQuery(
    { receiptNumber },
    { retry: false },
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-emerald-600 selection:text-white">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-800 mb-2 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Official Receipt Verification Portal</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            SchoolFin Verification Service
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Cryptographic authenticity confirmation for School Receipts
          </p>
        </div>

        {isLoading ? (
          <Card className="bg-white border-slate-200 text-slate-900 p-12 text-center shadow-sm">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Verifying receipt authenticity...</p>
          </Card>
        ) : error || !data ? (
          <Card className="bg-white border-rose-200 text-slate-900 shadow-sm">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-center mx-auto text-rose-700">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-base">Receipt Not Found</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Receipt not found. If you believe this is an error, contact the school.
                </p>
              </div>
              <div className="pt-2">
                <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                  Queried: {receiptNumber}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-emerald-200/80 text-slate-900 shadow-sm overflow-hidden">
            <div className="bg-emerald-50/80 border-b border-emerald-200/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Authentic Verified Receipt
                </span>
              </div>
              <Badge variant="success">Genuine</Badge>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="text-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Receipt Number</span>
                <p className="text-2xl font-black tracking-tight text-slate-900 font-mono mt-0.5">
                  {data.receiptNumber}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>Student First Name</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {data.studentFirstName}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Amount Paid</span>
                  </div>
                  <p className="text-sm font-black text-emerald-700">
                    {Number(data.amountPaid).toLocaleString("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    })}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Payment Date</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {new Date(data.dateOfPayment).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Building className="w-3.5 h-3.5" />
                    <span>Payment Method</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 uppercase">
                    {data.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Issued By
                </span>
                <p className="text-xs font-bold text-slate-900">{data.schoolName}</p>
                <p className="text-[11px] text-slate-600">{data.schoolAddress}</p>
              </div>

              <p className="text-[10px] text-slate-500 text-center italic">
                Verified against SchoolFin database. Student privacy protected under Nigeria Data Protection Act (NDPA).
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
