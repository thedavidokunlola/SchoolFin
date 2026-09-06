"use client";

// src/components/views/bursar/BursarDebtorsView.tsx
// Bursar debtor management, server-side search, Excel export, and bulk reminders

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SCHOOL_CLASSES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Download,
  Mail,
  Search,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

export function BursarDebtorsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [minAmount, setMinAmount] = useState<number | undefined>(undefined);
  const [minOverdueDays, setMinOverdueDays] = useState<number | undefined>(undefined);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderChannel, setReminderChannel] = useState<"EMAIL" | "SMS" | "BOTH">("BOTH");
  const [customMessage, setCustomMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 300ms search debounce per Rule PERF-1 / §H1-AC5
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: terms } = trpc.terms.getAll.useQuery();
  const activeTerm = terms?.find((t) => t.isActive);

  const {
    data: debtorsData,
    isLoading,
    refetch,
  } = trpc.debtors.getList.useQuery({
    termId: activeTerm?.id,
    class: selectedClass || undefined,
    search: debouncedSearch || undefined,
    minAmount: minAmount || undefined,
    minOverdueDays: minOverdueDays || undefined,
  });

  const togglePauseMutation = trpc.debtCollection.togglePause.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const bulkReminderMutation = trpc.debtors.sendBulkReminders.useMutation({
    onSuccess: (res) => {
      setSuccessMessage(`Successfully queued reminders for ${res.queuedCount} delivery channels.`);
      setSelectedStudentIds([]);
      setIsReminderModalOpen(false);
      setCustomMessage("");
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && debtorsData?.debtors) {
      setSelectedStudentIds(debtorsData.debtors.map((d) => d.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleDownloadExcel = () => {
    const params = new URLSearchParams();
    if (activeTerm?.id) params.set("termId", activeTerm.id);
    if (selectedClass) params.set("class", selectedClass);
    if (minAmount) params.set("minAmount", String(minAmount));
    if (minOverdueDays) params.set("minOverdueDays", String(minOverdueDays));

    window.open(`/api/reports/debtors?${params.toString()}`, "_blank");
  };

  const handleSendReminders = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) return;

    bulkReminderMutation.mutate({
      studentIds: selectedStudentIds,
      channel: reminderChannel,
      customMessage: customMessage || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Debtor Management & Reminders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track outstanding balances, pause automated collection per student, and export reports (Module H1, H2).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="md"
            onClick={handleDownloadExcel}
            className="w-full sm:w-auto gap-2 text-xs"
          >
            <Download className="w-4 h-4" /> Download Excel List
          </Button>

          <Button
            variant="accent"
            size="md"
            disabled={selectedStudentIds.length === 0}
            onClick={() => setIsReminderModalOpen(true)}
            className="w-full sm:w-auto gap-2 text-xs shadow-xs"
          >
            <Mail className="w-4 h-4" /> Send Bulk Reminders ({selectedStudentIds.length})
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <span>{successMessage}</span>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-rose-500 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Total Overdue Amount</span>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {debtorsData?.totalOutstanding
              ? Number(debtorsData.totalOutstanding).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })
              : "₦0.00"}
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Students in Debt</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {debtorsData?.totalDebtors ?? 0} Students
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase">Active Academic Term</span>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {activeTerm?.name || "No Active Term"}
          </p>
        </Card>
      </div>

      {/* Filter Controls (Rule PERF-1 server-side filter) */}
      <Card className="p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Search Student / Admission No
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Adewale or SF/2026/001"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Filter by Class
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

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Min. Outstanding Amount (₦)
            </label>
            <input
              type="number"
              placeholder="e.g. 50000"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              value={minAmount || ""}
              onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Min. Days Overdue
            </label>
            <input
              type="number"
              placeholder="e.g. 14"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              value={minOverdueDays || ""}
              onChange={(e) =>
                setMinOverdueDays(e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>
        </div>
      </Card>

      {/* Debtors Table */}
      <Card className="shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Debtor Roster</CardTitle>
            <CardDescription className="text-[11px]">
              Showing {debtorsData?.debtors.length || 0} debtors
            </CardDescription>
          </div>
          {selectedStudentIds.length > 0 && (
            <Badge variant="brand">{selectedStudentIds.length} Selected</Badge>
          )}
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 focus:border-emerald-600"
                    checked={
                      Boolean(debtorsData?.debtors &&
                      debtorsData.debtors.length > 0 &&
                      selectedStudentIds.length === debtorsData.debtors.length)
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="p-4">Student</th>
                <th className="p-4">Class</th>
                <th className="p-4">Parent / Contact</th>
                <th className="p-4">Outstanding (NGN)</th>
                <th className="p-4">Overdue Days</th>
                <th className="p-4">Automated Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading debtors list...
                  </td>
                </tr>
              ) : debtorsData?.debtors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6">
                    {searchTerm || selectedClass || minAmount || minOverdueDays ? (
                      <EmptyState
                        icon={<Search className="w-6 h-6 text-slate-600" />}
                        title="No Matching Debtors Found"
                        description="No student accounts match your current search criteria or debt filters. Try resetting the filters to view the full list."
                        actionLabel="Clear All Filters"
                        onAction={() => {
                          setSearchTerm("");
                          setSelectedClass("");
                          setMinAmount(undefined);
                          setMinOverdueDays(undefined);
                        }}
                        compact
                      />
                    ) : (
                      <EmptyState
                        icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
                        title="No Outstanding Debtors"
                        description="All student accounts are currently settled in full, or fee structures have not yet been posted to student ledgers for this academic term."
                        compact
                      />
                    )}
                  </td>
                </tr>
              ) : (
                debtorsData?.debtors.map((debtor) => (
                  <tr
                    key={debtor.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedStudentIds.includes(debtor.id) ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 focus:border-emerald-600"
                        checked={selectedStudentIds.includes(debtor.id)}
                        onChange={() => handleToggleSelectStudent(debtor.id)}
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      {debtor.firstName} {debtor.lastName}
                    </td>
                    <td className="p-4 font-mono text-[10px] text-slate-500 font-semibold">
                      {debtor.admissionNumber}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{debtor.class}</td>
                    <td className="p-4 text-slate-600">
                      {debtor.parent ? (
                        <div>
                          <span className="font-medium text-slate-800 block">
                            {debtor.parent.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {debtor.parent.phone || debtor.parent.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-600 text-[11px]">Unlinked Parent</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-rose-600">
                      {Number(debtor.outstandingBalance).toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-700">
                      {debtor.overdueDays} days
                    </td>
                    <td className="p-4">
                      <Badge variant={debtor.isPaused ? "warning" : "neutral"}>
                        {debtor.isPaused ? "PAUSED" : "ACTIVE"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() =>
                          togglePauseMutation.mutate({
                            studentId: debtor.id,
                            isPaused: !debtor.isPaused,
                          })
                        }
                      >
                        {debtor.isPaused ? (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-600" /> Resume
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-amber-600" /> Pause
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Bulk Reminder Modal */}
      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title={`Send Bulk Manual Reminders (${selectedStudentIds.length} Selected)`}
      >
        <form onSubmit={handleSendReminders} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Notification Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={reminderChannel === "BOTH" ? "accent" : "outline"}
                size="sm"
                onClick={() => setReminderChannel("BOTH")}
              >
                Email + SMS
              </Button>
              <Button
                type="button"
                variant={reminderChannel === "EMAIL" ? "accent" : "outline"}
                size="sm"
                onClick={() => setReminderChannel("EMAIL")}
              >
                Email Only
              </Button>
              <Button
                type="button"
                variant={reminderChannel === "SMS" ? "accent" : "outline"}
                size="sm"
                onClick={() => setReminderChannel("SMS")}
              >
                SMS Only
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Custom Reminder Message (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Leave blank to send standard payment link notice."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsReminderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              isLoading={bulkReminderMutation.isPending}
            >
              Send Reminders
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
