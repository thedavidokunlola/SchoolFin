"use client";

// src/components/common/SchoolOnboardingModal.tsx
// Compact 3-Step Guided School Onboarding Modal - Non-scrollable with concise copy

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
      badge: "Step 1 of 3",
      title: "Active Academic Term",
      description:
        "All fees, payments, and reminders are tied to your current academic term and payment deadline.",
      tabKey: "terms",
      icon: <Calendar className="w-6 h-6 text-[#2B35AF]" />,
      bullets: [
        "Sets the current term start and end dates",
        "Anchors fee deadlines and automated reminders",
      ],
    },
    {
      id: "students",
      number: "2",
      badge: "Step 2 of 3",
      title: "Students & Parents",
      description:
        "Enroll students and link parent accounts so families can check statements and pay fees online.",
      tabKey: "students",
      icon: <GraduationCap className="w-6 h-6 text-emerald-600" />,
      bullets: [
        "Tracks student balances by admission number",
        "Gives parents access to view receipts and balances",
      ],
    },
    {
      id: "fees",
      number: "3",
      badge: "Step 3 of 3",
      title: "Fee Structures & Invoicing",
      description:
        "Set up fee breakdowns by class and post invoices in one click with built-in duplicate prevention.",
      tabKey: "fees",
      icon: <FileSpreadsheet className="w-6 h-6 text-indigo-600" />,
      bullets: [
        "Transparent, itemized class fee breakdowns",
        "1-click bulk invoice posting for entire classes",
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
    if (onNavigate) {
      onNavigate("overview");
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title="Welcome to SchoolFin"
      description="Quick 3-step guide to help you get started"
    >
      <div className="space-y-4">
        {/* Step Progress Dots */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? "w-7 bg-[#2B35AF]"
                    : idx < currentStep
                    ? "w-3.5 bg-emerald-500"
                    : "w-3.5 bg-slate-200"
                }`}
                title={`Step ${idx + 1}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Active Step Card Content (Compact, Non-scrollable) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs shrink-0">
                {activeStep.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {activeStep.title}
                </h3>
                <Badge variant="brand" className="text-[9px] font-bold uppercase tracking-wider mt-0.5">
                  {activeStep.badge}
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {activeStep.description}
          </p>

          <div className="p-3 bg-white border border-slate-200/70 rounded-lg space-y-1.5">
            <ul className="space-y-1 text-xs text-slate-600">
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
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs text-slate-400 hover:text-slate-700 font-medium cursor-pointer"
          >
            Skip for now
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="gap-1 text-xs py-1.5 px-3 rounded-lg"
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
                className="gap-1.5 text-xs py-1.5 px-3.5 bg-[#2B35AF] hover:bg-[#1E257A] text-white font-bold rounded-lg cursor-pointer"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={handleComplete}
                className="gap-1.5 text-xs py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
