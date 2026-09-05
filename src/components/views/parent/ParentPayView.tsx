"use client";

// src/components/views/parent/ParentPayView.tsx
// Online fee payment flow with outstanding balance cap and receipt polling state (Module E1, Rule MONEY-8, PERF-4)

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CreditCard, ArrowLeft, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

export interface ParentPayViewProps {
  studentId: string;
  onBack?: () => void;
  onPaymentSuccess?: () => void;
}

export function ParentPayView({
  studentId,
  onBack,
  onPaymentSuccess,
}: ParentPayViewProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTxRef, setActiveTxRef] = useState<string | null>(null);

  const { data: student } = trpc.students.getById.useQuery({
    id: studentId,
  });
  const { data: terms } = trpc.terms.getAll.useQuery();
  const activeTerm = terms?.find((t) => t.isActive);

  // Set default amount to outstanding balance
  useEffect(() => {
    if (student?.outstandingBalance && !paymentAmount) {
      setPaymentAmount(student.outstandingBalance.toString());
    }
  }, [student, paymentAmount]);

  // Real-time payment verification polling query (Auto-refresh every 15s per Rule PERF-4 / E1-AC8)
  const verifyQuery = trpc.payments.verify.useQuery(
    { txRef: activeTxRef || "" },
    {
      enabled: Boolean(activeTxRef),
      refetchInterval: (data) => (data?.status === "SUCCESS" ? false : 3000),
    },
  );

  const initiateMutation = trpc.payments.initiateOnlinePayment.useMutation({
    onSuccess: (data) => {
      setActiveTxRef(data.txRef);
      // Redirect to Flutterwave checkout
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      }
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeTerm) {
      setErrorMsg("No active academic term found.");
      return;
    }

    const numAmount = Number(paymentAmount);
    const maxBalance = Number(student?.outstandingBalance || 0);

    // Rule MONEY-8: Enforce max outstanding balance limit
    if (numAmount <= 0) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }

    if (numAmount > maxBalance) {
      setErrorMsg(
        `Amount cannot exceed outstanding balance of ₦${maxBalance.toLocaleString()}`,
      );
      return;
    }

    initiateMutation.mutate({
      studentId,
      amount: paymentAmount,
      termId: activeTerm.id,
    });
  };

  const handleBack = (e: React.MouseEvent) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  const outstandingNumber = student?.outstandingBalance
    ? Number(student.outstandingBalance)
    : 0;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <Link
          href={`/parent/students/${studentId}`}
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Statement
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
          Pay School Fees Online
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Instant online payment via Debit Card, Bank Transfer, or USSD powered by Flutterwave.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Payment Error</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Polling / Pending Confirmation State (Rule PERF-4 / E1-AC8) */}
      {activeTxRef && (
        <Card className="p-6 text-center space-y-4 border-indigo-200 bg-indigo-50/40 shadow-xs">
          {verifyQuery.data?.status === "SUCCESS" ? (
            <div className="space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">Payment Confirmed!</h3>
              <p className="text-xs text-slate-600">
                Your payment has been verified. Official Receipt:{" "}
                <strong>{verifyQuery.data.receipt?.receiptNumber}</strong>
              </p>
              <div className="pt-3">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    if (onPaymentSuccess) onPaymentSuccess();
                    else if (onBack) onBack();
                  }}
                  className="shadow-xs"
                >
                  View Updated Account Statement
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <h3 className="font-bold text-slate-900 text-sm">Verifying Online Payment...</h3>
              <p className="text-xs text-slate-500">
                Transaction Ref: <span className="font-mono">{activeTxRef}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Waiting for Flutterwave confirmation. Your receipt is generating...
              </p>
            </div>
          )}
        </Card>
      )}

      <Card className="shadow-xs">
        <form onSubmit={handlePaySubmit}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              Payment Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              {student ? `${student.firstName} ${student.lastName} (${student.admissionNumber})` : "Loading..."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Outstanding Balance
                </span>
                <span className="text-xl font-extrabold text-slate-900">
                  {outstandingNumber.toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              </div>
              <Badge variant={outstandingNumber > 0 ? "danger" : "success"}>
                {outstandingNumber > 0 ? "Pending Due" : "Settled"}
              </Badge>
            </div>

            <div className="space-y-1">
              <Input
                label="Amount to Pay Now (NGN)"
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="e.g. 50000"
                helperText={`You can pay in full or any partial amount up to ₦${outstandingNumber.toLocaleString()}`}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              variant="accent"
              isLoading={initiateMutation.isPending}
              disabled={outstandingNumber <= 0}
              className="w-full py-3 shadow-xs font-bold"
            >
              Proceed to Secure Payment
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
