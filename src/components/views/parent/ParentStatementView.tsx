"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, CreditCard, Calendar, CheckCircle2, RefreshCw, X } from "lucide-react";

export interface ParentStatementViewProps {
  studentId: string;
  onBack?: () => void;
  onPay?: (studentId: string) => void;
  onInstallments?: (studentId: string) => void;
}

export function ParentStatementView({
  studentId,
  onBack,
  onPay,
  onInstallments,
}: ParentStatementViewProps) {
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  const txRef = searchParams.get("tx_ref") || searchParams.get("txRef") || "";
  const transactionId = searchParams.get("transaction_id") || searchParams.get("transactionId") || "";
  const statusParam = searchParams.get("status");

  const { data: student, isLoading, refetch } = trpc.students.getById.useQuery({
    id: studentId,
  });

  // Verify payment if redirected from Flutterwave with tx_ref or status
  const verifyQuery = trpc.payments.verify.useQuery(
    {
      txRef,
      transactionId: transactionId || undefined,
    },
    {
      enabled: Boolean(txRef && (statusParam === "successful" || statusParam === "complete" || statusParam === "completed")),
      refetchInterval: (data) => (data?.status === "SUCCESS" ? false : 3000),
    },
  );

  useEffect(() => {
    if (verifyQuery.data?.status === "SUCCESS") {
      utils.students.getById.invalidate({ id: studentId });
      const receiptNo = verifyQuery.data.receipt?.receiptNumber;
      setPaymentSuccessMsg(
        `Payment of ₦${Number(verifyQuery.data.amount).toLocaleString()} confirmed successfully! Receipt #${receiptNo || "Generated"} has been issued.`,
      );
    }
  }, [verifyQuery.data, studentId, utils]);

  // Auto-dismiss the payment success notification after 10 seconds
  useEffect(() => {
    if (paymentSuccessMsg) {
      const timer = setTimeout(() => {
        setPaymentSuccessMsg(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [paymentSuccessMsg]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading student financial records...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Student statement not accessible.
      </div>
    );
  }

  const outstandingBalanceNumber = student.outstandingBalance
    ? Number(student.outstandingBalance)
    : 0;

  const handleBack = (e: React.MouseEvent) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  const handlePay = (e: React.MouseEvent) => {
    if (onPay) {
      e.preventDefault();
      onPay(studentId);
    }
  };

  const handleInstallments = (e: React.MouseEvent) => {
    if (onInstallments) {
      e.preventDefault();
      onInstallments(studentId);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/parent/dashboard"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {outstandingBalanceNumber > 0 && (
          <div className="flex items-center gap-3">
            <Link
              href={`/parent/installments/${studentId}`}
              onClick={handleInstallments}
            >
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" /> Installment Plan
              </Button>
            </Link>
            <Link href={`/parent/pay/${studentId}`} onClick={handlePay}>
              <Button variant="accent" size="sm" className="gap-1.5 text-xs shadow-xs">
                <CreditCard className="w-3.5 h-3.5" /> Pay Online Now
              </Button>
            </Link>
          </div>
        )}
      </div>

      {paymentSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="font-semibold">{paymentSuccessMsg}</div>
          </div>
          <button
            type="button"
            onClick={() => setPaymentSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100/50 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {verifyQuery.isLoading && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-3 shadow-xs">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <div className="flex-1 font-semibold">Verifying and recording your online payment with Flutterwave...</div>
        </div>
      )}

      {/* Student Summary Card */}
      <Card className="p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Admission No: <strong className="text-slate-800 font-mono">{student.admissionNumber}</strong> • Class:{" "}
              <strong className="text-slate-800 font-semibold">{student.class}</strong>
            </p>
          </div>

          <div
            className={`p-4 rounded-xl text-right min-w-[200px] border ${
              outstandingBalanceNumber > 0
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider block">
              Current Term Balance
            </span>
            <span className="text-2xl font-black">
              {outstandingBalanceNumber.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              })}
            </span>
          </div>
        </div>
      </Card>

      {/* Payment History and Receipts Archive */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Verified Payments & Receipt Archive ({student.manualCredits.length + student.payments.length})
        </h2>

        <Card className="shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Receipt No</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {student.manualCredits.length === 0 && student.payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Cash Payments */}
                    {student.manualCredits.map((credit) => (
                      <tr key={credit.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          {new Date(credit.recordedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900">
                          {credit.receipt?.receiptNumber}
                        </td>
                        <td className="p-4">
                          <Badge variant="neutral">CASH</Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant="success">CONFIRMED</Badge>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-700">
                          {Number(credit.amount).toLocaleString("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          })}
                        </td>
                        <td className="p-4 text-right">
                          {credit.receipt?.receiptNumber && (
                            <Link
                              href={`/verify/receipt/${credit.receipt.receiptNumber}`}
                              target="_blank"
                              className="text-emerald-700 font-semibold text-xs hover:underline"
                            >
                              Verify Genuine
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Online Flutterwave Payments */}
                    {student.payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900">
                          {payment.receipt?.receiptNumber || "Pending Receipt"}
                        </td>
                        <td className="p-4">
                          <Badge variant="brand">{payment.method}</Badge>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              payment.status === "SUCCESS"
                                ? "success"
                                : payment.status === "FAILED"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-700">
                          {Number(payment.amount).toLocaleString("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          })}
                        </td>
                        <td className="p-4 text-right">
                          {payment.receipt?.receiptNumber && (
                            <Link
                              href={`/verify/receipt/${payment.receipt.receiptNumber}`}
                              target="_blank"
                              className="text-emerald-700 font-semibold text-xs hover:underline"
                            >
                              Verify Genuine
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
