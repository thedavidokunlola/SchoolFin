"use client";

// src/components/views/bursar/BursarCashRecordView.tsx
// Bursar cash credit recording with duplicate check, overpayment warning, and instant printable receipt

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Receipt, AlertTriangle, AlertCircle } from "lucide-react";

export function BursarCashRecordView() {
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Cash School Fees Payment");
  const [referenceNote, setReferenceNote] = useState("");

  // Warning prompts
  const [reasonForDuplicate, setReasonForDuplicate] = useState("");
  const [reasonForOverpayment, setReasonForOverpayment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: terms } = trpc.terms.getAll.useQuery();
  const { data: studentsData } = trpc.students.getAll.useQuery({});
  const activeTerm = terms?.find((t) => t.isActive);

  const checkDuplicateQuery = trpc.manualCredits.checkDuplicate.useQuery(
    { studentId, amount },
    { enabled: Boolean(studentId && amount && Number(amount) > 0) },
  );

  const recordCreditMutation = trpc.manualCredits.create.useMutation({
    onSuccess: (data) => {
      // Redirect to printable receipt viewer immediately per Assumption 7
      router.push(`/bursar/receipts/${data.receiptNumber}`);
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!studentId) {
      setFormError("Please select a student.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setFormError("Please enter a valid payment amount.");
      return;
    }

    if (!activeTerm) {
      setFormError("No active academic term configured.");
      return;
    }

    recordCreditMutation.mutate({
      studentId,
      amount,
      description,
      referenceNote: referenceNote || undefined,
      reasonForDuplicate: reasonForDuplicate || undefined,
      reasonForOverpayment: reasonForOverpayment || undefined,
      termId: activeTerm.id,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Record Manual Cash Payment
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Credit cash or bank transfer received in bursary. Generates an official printable receipt.
        </p>
      </div>

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Transaction Blocked</p>
            <p className="mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      {/* Duplicate Cash Warning Alert (Rule AUDIT-6 / D1-AC10) */}
      {checkDuplicateQuery.data?.isDuplicate && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Duplicate Payment Warning</p>
            <p>
              A cash payment of ₦{amount} was already recorded for{" "}
              <strong>{checkDuplicateQuery.data.studentName}</strong> today (Receipt:{" "}
              <span className="font-mono font-bold">
                {checkDuplicateQuery.data.existingReceiptNumber}
              </span>
              ).
            </p>
            <p className="text-amber-700">
              To confirm this is a separate genuine payment, please provide a typed reason below.
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-xs">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-700" />
              Cash Credit Form
            </CardTitle>
            <CardDescription className="text-xs">
              Enter payment details accurately. All credits are logged in the immutable audit trail.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Select Student</label>
              <select
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              >
                <option value="">Choose student receiving payment...</option>
                {studentsData?.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.admissionNumber} - {s.class})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Amount Paid (NGN)"
              type="number"
              required
              step="0.01"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <Input
              label="Description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. First Term Fees / Fee Waiver / Uniform"
            />

            <Input
              label="Reference Note / Teller No (Optional)"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="e.g. Cash Teller #48291"
            />

            {/* Conditional Reason for Duplicate */}
            {checkDuplicateQuery.data?.isDuplicate && (
              <div className="space-y-1 p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <label className="text-xs font-bold text-amber-900">
                  Reason for Duplicate Payment (Required)
                </label>
                <input
                  type="text"
                  required
                  value={reasonForDuplicate}
                  onChange={(e) => setReasonForDuplicate(e.target.value)}
                  placeholder="e.g. Parent paying second installment in cash same day"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>
            )}

            {/* Overpayment Reason Field (Rule MONEY-6 / D1-AC2) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Reason for Overpayment (If amount exceeds balance by ₦5,000+)
              </label>
              <input
                type="text"
                value={reasonForOverpayment}
                onChange={(e) => setReasonForOverpayment(e.target.value)}
                placeholder="e.g. Advance payment for next term's fees"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-0.5 text-slate-600">
              <p>
                Active Term: <strong>{activeTerm ? activeTerm.name : "None"}</strong>
              </p>
              <p className="text-[11px] text-slate-400">
                Receipt numbers are globally sequential (`RCP-YYYY-NNNNNN`) and tamper-proof.
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              variant="accent"
              isLoading={recordCreditMutation.isPending}
              className="w-full py-3 shadow-xs"
            >
              Record Cash Credit & Generate Receipt
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
