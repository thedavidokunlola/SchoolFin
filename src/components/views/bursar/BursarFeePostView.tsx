"use client";

// src/components/views/bursar/BursarFeePostView.tsx
// Bursar fee posting view (Bulk by class and individual student)

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SCHOOL_CLASSES } from "@/lib/constants";
import { Users, User, AlertCircle, CheckCircle2, ShieldAlert, PlusCircle, ArrowRight } from "lucide-react";

interface BursarFeePostViewProps {
  onNavigate?: (tab: string) => void;
}

export function BursarFeePostView({ onNavigate }: BursarFeePostViewProps) {
  const [mode, setMode] = useState<"bulk" | "individual">("bulk");

  // Form states
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>(SCHOOL_CLASSES[0]);
  const [selectedFeeStructureId, setSelectedFeeStructureId] = useState("");
  const [description, setDescription] = useState("Term Fee Charge");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [individualStudentClass, setIndividualStudentClass] = useState<string>("");
  const [isConfirmBulkModalOpen, setIsConfirmBulkModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: terms } = trpc.terms.getAll.useQuery();
  const { data: feeStructures, isLoading: isLoadingStructures } = trpc.fees.getStructures.useQuery({});
  
  const activeTerm = terms?.find((t) => t.isActive);
  const currentTermId = selectedTermId || activeTerm?.id || "";
  const currentTerm = terms?.find((t) => t.id === currentTermId) || activeTerm;

  const { data: studentsData } = trpc.students.getAll.useQuery({
    class: mode === "bulk" ? selectedClass : (individualStudentClass || undefined),
    isActive: true,
  });

  // Filter fee structures matching selected class and current term
  const classStructures = feeStructures?.filter(
    (fs) => fs.class === selectedClass && (!currentTermId || fs.termId === currentTermId),
  );

  // All structures available for current term across any class
  const termStructures = feeStructures?.filter(
    (fs) => !currentTermId || fs.termId === currentTermId,
  );

  // Classes that currently have fee structures defined for this term
  const classesWithStructures = Array.from(
    new Set(termStructures?.map((fs) => fs.class) ?? []),
  );

  const selectedStructure = feeStructures?.find((fs) => fs.id === selectedFeeStructureId);

  const postIndividualMutation = trpc.fees.postToStudent.useMutation({
    onSuccess: () => {
      setSuccessMessage("Fee successfully posted to student account.");
      setFormError(null);
      setSelectedStudentId("");
      setSelectedFeeStructureId("");
      utils.students.getAll.invalidate();
    },
    onError: (err) => setFormError(err.message),
  });

  const postBulkMutation = trpc.fees.postToClass.useMutation({
    onSuccess: (data) => {
      setIsConfirmBulkModalOpen(false);
      setSuccessMessage(
        `Successfully posted fees to ${data.postedCount} active students in class ${data.class}.`,
      );
      setFormError(null);
      setSelectedFeeStructureId("");
      utils.students.getAll.invalidate();
    },
    onError: (err) => {
      setIsConfirmBulkModalOpen(false);
      setFormError(err.message);
    },
  });

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!selectedFeeStructureId) {
      setFormError("Please select a fee structure.");
      return;
    }

    if (!currentTerm) {
      setFormError("No academic term selected. Please select or configure an active term.");
      return;
    }

    // Trigger Bulk Confirmation Screen per Rule MONEY-4 / C2-AC7
    setIsConfirmBulkModalOpen(true);
  };

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!selectedStudentId) {
      setFormError("Please select a student.");
      return;
    }

    if (!selectedFeeStructureId) {
      setFormError("Please select a fee structure.");
      return;
    }

    if (!currentTerm) {
      setFormError("No academic term selected.");
      return;
    }

    postIndividualMutation.mutate({
      studentId: selectedStudentId,
      feeStructureId: selectedFeeStructureId,
      termId: currentTerm.id,
      description,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Post Fees to Student Accounts
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Post termly fee schedules in bulk by class or to individual student accounts
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl w-fit">
        <button
          onClick={() => {
            setMode("bulk");
            setFormError(null);
            setSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === "bulk"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Bulk Post by Class
        </button>
        <button
          onClick={() => {
            setMode("individual");
            setFormError(null);
            setSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === "individual"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <User className="w-3.5 h-3.5" /> Individual Student Post
        </button>
      </div>

      {/* Feedback Alerts */}
      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Posting Blocked</p>
            <p className="mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Success</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {mode === "bulk" ? (
        <Card className="shadow-xs">
          <form onSubmit={handleBulkSubmit}>
            <CardHeader>
              <CardTitle className="text-base">Bulk Fee Posting</CardTitle>
              <CardDescription className="text-xs">
                Apply a term fee structure to all active students in a selected class
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Academic Term Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Academic Term</label>
                <select
                  value={currentTermId}
                  onChange={(e) => {
                    setSelectedTermId(e.target.value);
                    setSelectedFeeStructureId("");
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                >
                  {terms?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isActive ? "⭐ (Active Term)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Target Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedFeeStructureId("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  >
                    {SCHOOL_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c} {classesWithStructures.includes(c) ? "✓ (Configured)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Fee Structure ({selectedClass})
                  </label>
                  <select
                    value={selectedFeeStructureId}
                    onChange={(e) => setSelectedFeeStructureId(e.target.value)}
                    disabled={isLoadingStructures || (classStructures?.length ?? 0) === 0}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {(classStructures?.length ?? 0) === 0
                        ? `No fee structures configured for ${selectedClass}`
                        : "Select Fee Structure"}
                    </option>
                    {classStructures?.map((fs) => (
                      <option key={fs.id} value={fs.id}>
                        {fs.name} (₦{Number(fs.totalAmount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informative helper when no fee structures exist for the selected class */}
              {(!classStructures || classStructures.length === 0) && !isLoadingStructures && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-amber-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        No Fee Structure Configured for {selectedClass} ({currentTerm?.name})
                      </p>
                      <p className="text-amber-700 mt-0.5 text-[11px]">
                        Before posting fees to <strong>{selectedClass}</strong>, you need to define its fee structure (e.g., Tuition, Levy, Books) for this term.
                      </p>
                    </div>
                  </div>

                  {onNavigate && (
                    <div className="pt-1 pl-6">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onNavigate("fees")}
                        className="text-xs gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Create Fee Structure in &quot;Fee Structures&quot; Tab
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Input
                label="Description / Invoice Reference"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-slate-800">
                  Target Term: {currentTerm ? currentTerm.name : "None"}
                </p>
                <p className="text-slate-500">
                  Active students currently enrolled in {selectedClass}:{" "}
                  <strong className="text-slate-900 font-semibold">
                    {studentsData?.students.length ?? 0} students
                  </strong>
                </p>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                variant="accent"
                disabled={(classStructures?.length ?? 0) === 0}
                className="w-full sm:w-auto shadow-xs"
              >
                Review & Post to Class
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <Card className="shadow-xs">
          <form onSubmit={handleIndividualSubmit}>
            <CardHeader>
              <CardTitle className="text-base">Individual Fee Posting</CardTitle>
              <CardDescription className="text-xs">
                Apply a fee structure to a specific student account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Academic Term Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Academic Term</label>
                <select
                  value={currentTermId}
                  onChange={(e) => {
                    setSelectedTermId(e.target.value);
                    setSelectedFeeStructureId("");
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                >
                  {terms?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isActive ? "⭐ (Active Term)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Filter Student by Class</label>
                  <select
                    value={individualStudentClass}
                    onChange={(e) => {
                      setIndividualStudentClass(e.target.value);
                      setSelectedStudentId("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  >
                    <option value="">All Classes</option>
                    {SCHOOL_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Select Student</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  >
                    <option value="">Choose a student...</option>
                    {studentsData?.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.admissionNumber} - {s.class})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Fee Structure</label>
                <select
                  value={selectedFeeStructureId}
                  onChange={(e) => setSelectedFeeStructureId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                >
                  <option value="">Select Fee Structure</option>
                  {termStructures?.map((fs) => (
                    <option key={fs.id} value={fs.id}>
                      {fs.name} — {fs.class} (₦{Number(fs.totalAmount).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Description / Invoice Reference"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                variant="accent"
                isLoading={postIndividualMutation.isPending}
                className="w-full sm:w-auto shadow-xs"
              >
                Post to Student
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Mandatory Bulk Posting Confirmation Modal (Rule MONEY-4 / C2-AC7) */}
      <Modal
        isOpen={isConfirmBulkModalOpen}
        onClose={() => setIsConfirmBulkModalOpen(false)}
        title="Confirm Bulk Fee Posting"
        description="Review details before committing charges to student accounts"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Irreversible Action Warning</p>
              <p className="mt-0.5">
                Fee postings can only be reversed within 24 hours by the proprietor. Duplicate postings to the same students are permanently blocked.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Target Term:</span>
              <span className="font-bold text-slate-900">{currentTerm?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Target Class:</span>
              <span className="font-bold text-slate-900">{selectedClass}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Active Students Affected:</span>
              <span className="font-bold text-slate-900">
                {studentsData?.students.length ?? 0} Students
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Fee Structure:</span>
              <span className="font-bold text-slate-900">
                {selectedStructure?.name}
              </span>
            </div>
            <div className="flex justify-between py-1 pt-2">
              <span className="text-slate-700 font-semibold">Total Amount Per Student:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {Number(selectedStructure?.totalAmount ?? 0).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
              </span>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsConfirmBulkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              isLoading={postBulkMutation.isPending}
              onClick={() => {
                if (!currentTerm) return;
                postBulkMutation.mutate({
                  class: selectedClass,
                  feeStructureId: selectedFeeStructureId,
                  termId: currentTerm.id,
                  description,
                });
              }}
            >
              Confirm Post
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
