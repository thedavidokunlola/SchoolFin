"use client";

// src/components/views/parent/ParentOverviewView.tsx
// Consolidated Parent Portal Dashboard overview (Assumption 6)

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { GraduationCap, ArrowRight } from "lucide-react";

export interface ParentOverviewViewProps {
  onSelectStudent?: (studentId: string) => void;
}

export function ParentOverviewView({ onSelectStudent }: ParentOverviewViewProps) {
  const { data: session } = useSession();
  const { data: linkedStudents = [], isLoading } = trpc.parents.getMyChildren.useQuery();

  const handleSelect = (studentId: string, e: React.MouseEvent) => {
    if (onSelectStudent) {
      e.preventDefault();
      onSelectStudent(studentId);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
          Welcome, {session?.user?.firstName || "Parent"}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Consolidated family portal. View fee cards, outstanding balances, and official receipts.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Your Children ({linkedStudents.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CardGridSkeleton count={2} />
          </div>
        ) : !linkedStudents || linkedStudents.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-6 h-6" />}
            title="No Children Linked Yet"
            description="No student accounts have been linked to your parent portal profile yet. Please contact the school bursary with your child's admission number to link their record."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {linkedStudents.map((student) => (
              <Card key={student.id} className="p-6 rounded-2xl border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#12151E] text-white flex items-center justify-center font-black text-base shadow-xs border border-slate-800">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Class: <strong>{student.class}</strong> • Admission:{" "}
                        <span className="font-mono font-medium text-slate-700">{student.admissionNumber}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Credit Surplus
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {Number(student.creditBalance).toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </span>
                  </div>

                  <Link
                    href={`/parent/students/${student.id}`}
                    onClick={(e) => handleSelect(student.id, e)}
                  >
                    <Button variant="accent" size="sm" className="gap-1.5 text-xs shadow-xs rounded-xl">
                      View Statement <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

