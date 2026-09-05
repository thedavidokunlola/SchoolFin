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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome, {session?.user?.firstName || "Parent"}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Consolidated family portal. View fee cards, outstanding balances, and official receipts.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Your Children ({linkedStudents.length})
        </h2>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading family profiles...
          </div>
        ) : linkedStudents.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-6 h-6" />}
            title="No Children Linked Yet"
            description="No student accounts have been linked to your parent portal profile yet. Please contact the school bursary with your child's admission number to link their record."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {linkedStudents.map((student) => (
              <Card key={student.id} className="p-6 hover:shadow-xs transition-all shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Class: <strong>{student.class}</strong> • Admission:{" "}
                        <span className="font-mono">{student.admissionNumber}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Credit Surplus
                    </span>
                    <span className="text-xs font-bold text-slate-700">
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
                    <Button variant="accent" size="sm" className="gap-1.5 text-xs shadow-xs">
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
