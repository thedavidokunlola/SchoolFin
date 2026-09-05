"use client";

// src/app/(bursar)/bursar/students/[id]/page.tsx
// Student Financial Profile (Module B1)

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import {
  GraduationCap,
  Receipt,
  CreditCard,
  User,
  Phone,
  Mail,
  Plus,
  ArrowLeft,
  FileText,
  Clock,
} from "lucide-react";

export default function BursarStudentProfilePage() {
  const params = useParams();
  const studentId = params.id as string;

  const [activeTab, setActiveTab] = useState<"postings" | "payments" | "notes">("postings");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const utils = trpc.useUtils();
  const { data: student, isLoading } = trpc.students.getById.useQuery({
    id: studentId,
  });

  const addNoteMutation = trpc.students.addNote.useMutation({
    onSuccess: () => {
      utils.students.getById.invalidate({ id: studentId });
      setIsNoteModalOpen(false);
      setNoteContent("");
    },
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    addNoteMutation.mutate({ studentId, content: noteContent });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-xs text-slate-400">
          Loading student financial profile...
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-xs text-slate-400">
          Student not found.
        </div>
      </DashboardLayout>
    );
  }

  const outstandingBalanceNumber = student.outstandingBalance
    ? Number(student.outstandingBalance)
    : 0;

  const creditBalanceNumber = Number(student.creditBalance);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Back navigation */}
        <div>
          <Link
            href="/bursar/students"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Register
          </Link>
        </div>

        {/* Top Student Header Card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {student.firstName[0]}
                {student.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    {student.firstName} {student.lastName}
                  </h1>
                  <Badge variant={student.isActive ? "success" : "danger"}>
                    {student.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Admission No: <strong className="text-slate-800 font-mono">{student.admissionNumber}</strong> • Class:{" "}
                  <strong className="text-slate-800 font-semibold">{student.class}</strong>
                </p>
              </div>
            </div>

            {/* Balances */}
            <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-right min-w-[160px]">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Credit Surplus
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {creditBalanceNumber.toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              </div>

              <div
                className={`p-4 rounded-xl text-right min-w-[180px] border ${
                  outstandingBalanceNumber > 0
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider block">
                  Outstanding Balance
                </span>
                <span className="text-xl font-black">
                  {outstandingBalanceNumber.toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Linked Parent Information */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Linked Parent(s):</span>
            {student.parentLinks.length === 0 ? (
              <span className="text-slate-400 italic">No parent linked yet</span>
            ) : (
              student.parentLinks.map((link) => (
                <div key={link.id} className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900">
                    {link.parent.firstName} {link.parent.lastName} ({link.relationship})
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Mail className="w-3 h-3" /> {link.parent.email}
                  </span>
                  {link.parent.phone && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {link.parent.phone}
                      </span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("postings")}
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "postings"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Fee Postings & Invoices ({student.feePostings.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "payments"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Payment History & Receipts ({student.manualCredits.length + student.payments.length})
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "notes"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Internal Bursary Notes ({student.notes.length})
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "postings" && (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Date Posted</th>
                    <th className="p-4">Term</th>
                    <th className="p-4">Fee Structure / Description</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Posted By</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.feePostings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No fee postings recorded for this student.
                      </td>
                    </tr>
                  ) : (
                    student.feePostings.map((posting) => (
                      <tr key={posting.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          {new Date(posting.postedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          {posting.term.name}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-900 block">
                            {posting.feeStructure.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {posting.description}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant={posting.type === "CHARGE" ? "neutral" : "danger"}>
                            {posting.type}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-600">
                          {posting.postedBy.firstName} {posting.postedBy.lastName}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900">
                          {posting.type === "REVERSAL" ? "-" : "+"}
                          {Number(posting.amount).toLocaleString("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === "payments" && (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Receipt Number</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Recorded By</th>
                    <th className="p-4 text-right">Amount Paid</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.manualCredits.length === 0 && student.payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    student.manualCredits.map((credit) => (
                      <tr key={credit.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          {new Date(credit.recordedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900">
                          {credit.receipt?.receiptNumber}
                        </td>
                        <td className="p-4">
                          <Badge variant="success">CASH</Badge>
                        </td>
                        <td className="p-4 text-slate-700">
                          {credit.description}
                        </td>
                        <td className="p-4 text-slate-600">
                          {credit.recordedBy.firstName} {credit.recordedBy.lastName}
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-600">
                          {Number(credit.amount).toLocaleString("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          })}
                        </td>
                        <td className="p-4 text-right">
                          {credit.receipt?.receiptNumber && (
                            <Link href={`/bursar/receipts/${credit.receipt.receiptNumber}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                Print Receipt
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="accent"
                size="sm"
                onClick={() => setIsNoteModalOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Add Bursary Note
              </Button>
            </div>

            <Card>
              <CardContent className="p-6 divide-y divide-slate-100 space-y-4">
                {student.notes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No internal notes added for this student.
                  </p>
                ) : (
                  student.notes.map((note) => (
                    <div key={note.id} className="pt-4 first:pt-0 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {note.author.firstName} {note.author.lastName} ({note.author.role})
                        </span>
                        <span className="font-mono text-[11px]">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{note.content}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Note Modal */}
        <Modal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          title="Add Internal Bursary Note"
          description="Private note visible to Bursar and Proprietor only"
        >
          <form onSubmit={handleAddNote} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Note Content</label>
              <textarea
                required
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="e.g. Parent promised payment of remaining balance by next Friday..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNoteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                isLoading={addNoteMutation.isPending}
              >
                Save Note
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
