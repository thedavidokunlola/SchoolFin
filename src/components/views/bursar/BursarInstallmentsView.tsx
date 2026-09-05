"use client";

// src/components/views/bursar/BursarInstallmentsView.tsx
// Bursar Installments management & template configurator (Module F1, F3)

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Plus } from "lucide-react";

export function BursarInstallmentsView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [numberOfParts, setNumberOfParts] = useState(3);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: plans, isLoading } = trpc.installments.getPresets.useQuery();

  const createMutation = trpc.installments.createPreset.useMutation({
    onSuccess: () => {
      utils.installments.getPresets.invalidate();
      setIsModalOpen(false);
      setName("");
      setDescription("");
      setNumberOfParts(3);
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    createMutation.mutate({
      name,
      description: description || undefined,
      numberOfParts: Number(numberOfParts),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Installment Plans & Schedules
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure installment structures and auto-charge schedules (Module F1, F3).
          </p>
        </div>

        <Button
          variant="accent"
          size="md"
          onClick={() => setIsModalOpen(true)}
          className="gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" /> Create Installment Plan Template
        </Button>
      </div>

      {/* Plans Table */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base">Active Installment Plan Templates</CardTitle>
          <CardDescription className="text-xs">
            Structures available for parents during fee checkout
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Plan Name</th>
                <th className="p-4">Description</th>
                <th className="p-4">Number of Parts</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Loading plans...
                  </td>
                </tr>
              ) : plans?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No installment plan templates configured yet.
                  </td>
                </tr>
              ) : (
                plans?.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{plan.name}</td>
                    <td className="p-4 text-slate-600">{plan.description || "Standard schedule"}</td>
                    <td className="p-4 font-semibold text-slate-700">
                      {plan.numberOfParts} Equal Installments
                    </td>
                    <td className="p-4">
                      <Badge variant={plan.isActive ? "success" : "neutral"}>
                        {plan.isActive ? "Active" : "Archived"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal for Creating Plan Template */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Installment Plan Template"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          <Input
            label="Plan Template Name"
            required
            placeholder="e.g. 3-Part Term Schedule"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Initial payment + 2 monthly installments"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Number of Installment Parts (2 - 6)"
            type="number"
            required
            min={2}
            max={6}
            value={numberOfParts}
            onChange={(e) => setNumberOfParts(Number(e.target.value))}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={createMutation.isPending}>
              Create Plan Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
