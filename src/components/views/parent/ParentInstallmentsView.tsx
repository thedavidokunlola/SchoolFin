"use client";

// src/components/views/parent/ParentInstallmentsView.tsx
// Parent Installment Plan Selector & Schedule View (Module F2)

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export interface ParentInstallmentsViewProps {
  studentId: string;
  onBack?: () => void;
  onPlanSelected?: () => void;
}

export function ParentInstallmentsView({
  studentId,
  onBack,
  onPlanSelected,
}: ParentInstallmentsViewProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: student } = trpc.students.getById.useQuery({
    id: studentId,
  });
  const { data: plans } = trpc.installments.getPresets.useQuery();
  const { data: currentInstallments, refetch: refetchInstallments } = trpc.installments.getStudentPlan.useQuery({
    studentId,
  });
  const { data: terms } = trpc.terms.getAll.useQuery();
  const activeTerm = terms?.find((t) => t.isActive);

  const selectPlanMutation = trpc.installments.selectPlan.useMutation({
    onSuccess: () => {
      refetchInstallments();
      if (onPlanSelected) onPlanSelected();
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  const handleSelectPlan = (planId: string) => {
    setErrorMsg(null);
    if (!activeTerm) {
      setErrorMsg("No active term configured.");
      return;
    }

    selectPlanMutation.mutate({
      studentId,
      planId,
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link
          href={`/parent/students/${studentId}`}
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Statement
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
          Flexible Installment Plans
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Spread your child's term fees across structured automatic payments.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Active Schedule View if Installments Exist */}
      {currentInstallments && currentInstallments.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/30 shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Active Installment Schedule ({currentInstallments[0]?.plan.name})
                </CardTitle>
                <CardDescription className="text-xs text-emerald-700">
                  Term: {currentInstallments[0]?.term.name}
                </CardDescription>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            <div className="divide-y divide-emerald-100 text-xs">
              {currentInstallments.map((inst) => (
                <div
                  key={inst.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      Installment Part #{inst.partNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Due: {new Date(inst.dueDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-900">
                      {Number(inst.amountDue).toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </span>
                    <Badge
                      variant={
                        inst.paidAt
                          ? "success"
                          : inst.failedAttempts > 0
                            ? "danger"
                            : "warning"
                      }
                    >
                      {inst.paidAt ? "PAID" : inst.failedAttempts > 0 ? "RETRYING" : "PENDING"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Selection */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Available Installment Plan Options
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans?.map((plan) => {
            const estimatedPartAmount = outstandingNumber / plan.numberOfParts;
            return (
              <Card key={plan.id} className="p-5 flex flex-col justify-between hover:border-slate-400 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">{plan.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                      {plan.numberOfParts} Parts
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {plan.description || `Split balance into ${plan.numberOfParts} equal monthly payments`}
                  </p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Per Installment:</span>
                      <span className="font-bold text-slate-900">
                        {estimatedPartAmount.toLocaleString("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <Button
                    variant="accent"
                    size="sm"
                    className="w-full shadow-xs"
                    isLoading={selectPlanMutation.isPending}
                    disabled={outstandingNumber <= 0}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    Select {plan.name}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
