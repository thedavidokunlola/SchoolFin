"use client";

// src/components/views/accountant/AccountantStudentsView.tsx
// Accountant read-only student ledgers view

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCHOOL_CLASSES } from "@/lib/constants";
import { Search, ChevronRight, GraduationCap } from "lucide-react";

export function AccountantStudentsView() {
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { data, isLoading } = trpc.students.getAll.useQuery({
    search: search || undefined,
    class: selectedClass || undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Student Fee Ledgers
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Audit-ready view of all student fee accounts and billing status
        </p>
      </div>

      {/* Filter / Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or admission number..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
          />
        </div>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
        >
          <option value="">All Classes</option>
          {SCHOOL_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
        >
          <option value="all">All Statuses (Active & Inactive)</option>
          <option value="active">Active (Enrolled)</option>
          <option value="inactive">Inactive / Left School</option>
        </select>
      </div>

      {/* Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Admission No</th>
                <th className="p-4">Class</th>
                <th className="p-4">Linked Parent</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading ledgers...
                  </td>
                </tr>
              ) : data?.students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    {search || selectedClass || statusFilter !== "all" ? (
                      <EmptyState
                        icon={<Search className="w-6 h-6 text-slate-600" />}
                        title="No Matching Students Found"
                        description="No student fee accounts match your search filters. Try clearing or broadening your search criteria."
                        actionLabel="Clear Search Filters"
                        onAction={() => {
                          setSearch("");
                          setSelectedClass("");
                          setStatusFilter("all");
                        }}
                        compact
                      />
                    ) : (
                      <EmptyState
                        icon={<GraduationCap className="w-6 h-6 text-[#2B35AF]" />}
                        title="No Enrolled Students"
                        description="The school roster is currently empty. As soon as the bursary enrolls students, their financial ledgers will appear here for audit review."
                        compact
                      />
                    )}
                  </td>
                </tr>
              ) : (
                data?.students.map((student) => {
                  const linkedParent = student.parentLinks[0]?.parent;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        {student.admissionNumber}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {student.class}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        {linkedParent ? (
                          `${linkedParent.firstName} ${linkedParent.lastName}`
                        ) : (
                          <span className="text-slate-400 italic">Unlinked</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={student.isActive ? "success" : "danger"}>
                          {student.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/bursar/students/${student.id}`}>
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            View Ledger <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
