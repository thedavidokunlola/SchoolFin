"use client";

// src/components/common/SchoolOnboardingModal.tsx
// 3-Card Guided School Onboarding Modal for fresh deployments and new administrators

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Calendar,
  GraduationCap,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export interface SchoolOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export function SchoolOnboardingModal({
  isOpen,
  onClose,
  onNavigate,
}: SchoolOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: "term",
      number: "1",
      badge: "Step 1 of 3 • Foundation",
      title: "Academic Term & Billing Calendar",
      description:
        "Every financial ledger, fee schedule, and debt collection scan in SchoolFin is anchored to an active academic term with a clear payment due date.",
      highlight: "Active Session Configured",
      actionText: "Manage Terms",
      tabKey: "terms",
      icon: <Calendar className="w-8 h-8 text-[#2B35AF]" />,
      bullets: [
        "Defines the term start and closing dates",
        "Sets the anchor deadline for payment reminders",
        "Maintains audit separation across school years",
      ],
    },
    {
      id: "students",
      number: "2",
      badge: "Step 2 of 3 • Roster",
      title: "Student Enrollment & Parent Linking",
      description:
        "Enroll students with their official admission numbers and link parent accounts so parents can securely log in, view statements, and pay online.",
      highlight: "Enrolling Your First Batch",
      actionText: "Go to Students Roster",
      tabKey: "students",
      icon: <GraduationCap className="w-8 h-8 text-emerald-600" />,
      bullets: [
        "Admission number is the unique ledger key",
        "Parents get private portal access for their children",
        "Supports credit surplus balances automatically",
      ],
    },
    {
      id: "fees",
      number: "3",
      badge: "Step 3 of 3 • Invoicing",
      title: "Class Fee Structures & Bulk Invoicing",
      description:
        "Configure itemised fee structures (Tuition, ICT, Development Levy) per class, then post them to entire classes in one click with built-in duplicate protection.",
      highlight: "Ready to Post Invoices",
      actionText: "Configure Fee Structures",
      tabKey: "fees",
      icon: <FileSpreadsheet className="w-8 h-8 text-indigo-600" />,
      bullets: [
        "Itemised line items with full transparency",
        "1-click bulk posting to all students in a class",
        "Enforces strict anti-duplicate billing rules",
      ],
    },
  ];

  const activeStep = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("schoolfin_onboarding_shown", "true");
    }
    onClose();
  };

  const handleDirectAction = (tabKey: string) => {
    handleComplete();
    if (onNavigate) {
      onNavigate(tabKey);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="Welcome to SchoolFin"
      description="Quick 3-step setup guide for your school finance and fee management portal"
    >
      <div className="space-y-6 pt-1">
        {/* Step Progress Dots */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? "w-8 bg-[#2B35AF]"
                    : idx < currentStep
                    ? "w-4 bg-emerald-500"
                    : "w-4 bg-slate-200"
                }`}
                title={`Step ${idx + 1}`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-500">
            Card {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Active Step Card Content */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white p-6 sm:p-7 shadow-xs space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs shrink-0">
              {activeStep.icon}
            </div>
            <Badge variant="brand" className="text-[10px] font-bold uppercase tracking-wider">
              {activeStep.badge}
            </Badge>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
              {activeStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              {activeStep.description}
            </p>
          </div>

          <div className="p-4 bg-white/80 border border-slate-200/60 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
              Key Capabilities:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {activeStep.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline-offset-4 hover:underline"
          >
            Skip & Proceed to Dashboard
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={handleNext}
                className="gap-1.5 text-xs bg-[#2B35AF] hover:bg-[#1E257A] text-white shadow-xs font-bold"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={handleComplete}
                className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-bold"
              >
                <Sparkles className="w-4 h-4" /> Finish & Open Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
