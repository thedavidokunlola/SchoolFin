"use client";

// src/components/views/bursar/BursarFeeStructuresView.tsx
// Bursar fee structure creation, editing, deletion, and template management

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SCHOOL_CLASSES } from "@/lib/constants";
import { Plus, Trash2, Edit2, AlertTriangle, FileText } from "lucide-react";

interface FeeStructureItem {
  id: string;
  name: string;
  class: string;
  termId: string;
  totalAmount: unknown;
  isActive: boolean;
  term: {
    id: string;
    name: string;
  };
  lineItems: {
    id: string;
    label: string;
    amount: unknown;
    isOptional: boolean;
  }[];
  _count?: {
    postings: number;
  };
}

export function BursarFeeStructuresView() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Create Form State
  const [name, setName] = useState("");
  const [className, setClassName] = useState<string>(SCHOOL_CLASSES[0]);
  const [termId, setTermId] = useState("");
  const [lineItems, setLineItems] = useState<
    { label: string; amount: string; isOptional: boolean }[]
  >([{ label: "Tuition Fee", amount: "150000", isOptional: false }]);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Form State
  const [editingStructure, setEditingStructure] = useState<FeeStructureItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editTermId, setEditTermId] = useState("");
  const [editLineItems, setEditLineItems] = useState<
    { label: string; amount: string; isOptional: boolean }[]
  >([]);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Delete State
  const [deletingStructure, setDeletingStructure] = useState<FeeStructureItem | null>(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: terms } = trpc.terms.getAll.useQuery();
  const { data: structures, isLoading } = trpc.fees.getStructures.useQuery({});

  const createMutation = trpc.fees.createStructure.useMutation({
    onSuccess: () => {
      utils.fees.getStructures.invalidate();
      setIsCreateOpen(false);
      setName("");
      setLineItems([{ label: "Tuition Fee", amount: "", isOptional: false }]);
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });

  const updateMutation = trpc.fees.updateStructure.useMutation({
    onSuccess: () => {
      utils.fees.getStructures.invalidate();
      setEditingStructure(null);
      setEditFormError(null);
    },
    onError: (err) => setEditFormError(err.message),
  });

  const deleteMutation = trpc.fees.deleteStructure.useMutation({
    onSuccess: () => {
      utils.fees.getStructures.invalidate();
      setDeletingStructure(null);
      setDeleteError(null);
      setForceDelete(false);
    },
    onError: (err) => setDeleteError(err.message),
  });

  const activeTerm = terms?.find((t) => t.isActive);

  // Create Form Handlers
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { label: "", amount: "", isOptional: false }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (
    index: number,
    field: "label" | "amount" | "isOptional",
    value: string | boolean,
  ) => {
    const updated = [...lineItems];
    // @ts-expect-error dynamic property update
    updated[index][field] = value;
    setLineItems(updated);
  };

  const totalCalculated = lineItems.reduce((sum, item) => {
    const amt = parseFloat(item.amount) || 0;
    return sum + amt;
  }, 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const targetTermId = termId || activeTerm?.id;

    if (!targetTermId) {
      setFormError("Please select or configure an active academic term first.");
      return;
    }

    if (lineItems.length === 0) {
      setFormError("Please add at least one fee line item.");
      return;
    }

    createMutation.mutate({
      name,
      class: className,
      termId: targetTermId,
      lineItems,
    });
  };

  // Edit Form Handlers
  const handleOpenEdit = (structure: FeeStructureItem) => {
    setEditingStructure(structure);
    setEditName(structure.name);
    setEditClassName(structure.class);
    setEditTermId(structure.termId);
    setEditLineItems(
      structure.lineItems.map((item) => ({
        label: item.label,
        amount: String(item.amount),
        isOptional: item.isOptional ?? false,
      })),
    );
    setEditFormError(null);
  };

  const handleAddEditLineItem = () => {
    setEditLineItems([...editLineItems, { label: "", amount: "", isOptional: false }]);
  };

  const handleRemoveEditLineItem = (index: number) => {
    setEditLineItems(editLineItems.filter((_, i) => i !== index));
  };

  const handleEditLineItemChange = (
    index: number,
    field: "label" | "amount" | "isOptional",
    value: string | boolean,
  ) => {
    const updated = [...editLineItems];
    // @ts-expect-error dynamic property update
    updated[index][field] = value;
    setEditLineItems(updated);
  };

  const editTotalCalculated = editLineItems.reduce((sum, item) => {
    const amt = parseFloat(item.amount) || 0;
    return sum + amt;
  }, 0);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStructure) return;
    setEditFormError(null);

    if (editLineItems.length === 0) {
      setEditFormError("Please add at least one fee line item.");
      return;
    }

    updateMutation.mutate({
      id: editingStructure.id,
      name: editName,
      class: editClassName,
      termId: editTermId,
      lineItems: editLineItems,
    });
  };

  // Delete Handler
  const handleDelete = () => {
    if (!deletingStructure) return;
    setDeleteError(null);
    deleteMutation.mutate({
      id: deletingStructure.id,
      force: forceDelete,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fee Structures
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define, edit, and manage itemized termly fee schedules per class
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => {
            setTermId(activeTerm?.id || "");
            setIsCreateOpen(true);
          }}
          className="w-full sm:w-auto gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" /> Create Fee Structure
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 p-12 text-center text-xs text-slate-400">
            Loading fee structures...
          </div>
        ) : (structures as FeeStructureItem[] | undefined)?.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-xs text-slate-400">
            No fee structures configured. Click &quot;Create Fee Structure&quot; to build one.
          </div>
        ) : (
          (structures as FeeStructureItem[] | undefined)?.map((structure) => (
            <Card key={structure.id} className="flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="brand">{structure.class}</Badge>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {structure.term.name}
                      </span>
                      {/* Action Buttons */}
                      <button
                        onClick={() => handleOpenEdit(structure)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Edit Fee Structure"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingStructure(structure);
                          setDeleteError(null);
                          setForceDelete(false);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Fee Structure"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">{structure.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="divide-y divide-slate-100 text-xs">
                    {structure.lineItems.map((item) => (
                      <div
                        key={item.id}
                        className="py-2 flex items-center justify-between text-slate-600"
                      >
                        <span>{item.label}</span>
                        <span className="font-semibold text-slate-900">
                          {Number(item.amount).toLocaleString("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Charge
                  </span>
                  {structure._count && structure._count.postings > 0 && (
                    <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3" /> Posted to {structure._count.postings} student(s)
                    </span>
                  )}
                </div>
                <span className="text-base font-black text-slate-900">
                  {Number(structure.totalAmount).toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Fee Structure Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Fee Structure"
        description="Build an itemized fee template for a specific class"
        maxWidth="xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Structure Name (e.g. 2025/2026 Term 1 Tuition)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Class</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              >
                {SCHOOL_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Academic Term</label>
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              >
                {terms?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isActive ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Line Items
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddLineItem}
                className="text-xs text-emerald-700 hover:text-emerald-800"
              >
                + Add Line Item
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Item Label (e.g. Tuition)"
                    value={item.label}
                    onChange={(e) =>
                      handleLineItemChange(idx, "label", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Amount (NGN)"
                    value={item.amount}
                    onChange={(e) =>
                      handleLineItemChange(idx, "amount", e.target.value)
                    }
                    className="w-32 px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs mt-2">
              <span className="font-bold text-slate-700">Total Calculated Amount:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {totalCalculated.toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              isLoading={createMutation.isPending}
            >
              Save Fee Structure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Fee Structure Modal */}
      <Modal
        isOpen={!!editingStructure}
        onClose={() => setEditingStructure(null)}
        title="Edit Fee Structure"
        description="Modify fee items, class assignment, or academic term"
        maxWidth="xl"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {editFormError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {editFormError}
            </div>
          )}

          <Input
            label="Structure Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Class</label>
              <select
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              >
                {SCHOOL_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Academic Term</label>
              <select
                value={editTermId}
                onChange={(e) => setEditTermId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              >
                {terms?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isActive ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Line Items
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddEditLineItem}
                className="text-xs text-emerald-700 hover:text-emerald-800"
              >
                + Add Line Item
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {editLineItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Item Label (e.g. Tuition)"
                    value={item.label}
                    onChange={(e) =>
                      handleEditLineItemChange(idx, "label", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Amount (NGN)"
                    value={item.amount}
                    onChange={(e) =>
                      handleEditLineItemChange(idx, "amount", e.target.value)
                    }
                    className="w-32 px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                  {editLineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEditLineItem(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs mt-2">
              <span className="font-bold text-slate-700">Total Calculated Amount:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {editTotalCalculated.toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingStructure(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              isLoading={updateMutation.isPending}
            >
              Update Fee Structure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Fee Structure Modal */}
      <Modal
        isOpen={!!deletingStructure}
        onClose={() => setDeletingStructure(null)}
        title="Delete Fee Structure"
        description="Permanently remove or cascade delete this fee structure"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Delete Prevented</p>
                <p className="mt-0.5">{deleteError}</p>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Structure Name:</span>
              <span className="font-bold text-slate-900">{deletingStructure?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Class & Term:</span>
              <span className="font-bold text-slate-900">
                {deletingStructure?.class} ({deletingStructure?.term.name})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Amount:</span>
              <span className="font-bold text-slate-900">
                {Number(deletingStructure?.totalAmount ?? 0).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
              </span>
            </div>
            {deletingStructure?._count && deletingStructure._count.postings > 0 && (
              <div className="flex justify-between text-amber-800 font-semibold pt-1 border-t border-slate-200">
                <span>Active Fee Postings:</span>
                <span>{deletingStructure._count.postings} student records</span>
              </div>
            )}
          </div>

          {deletingStructure?._count && deletingStructure._count.postings > 0 && (
            <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 cursor-pointer">
              <input
                type="checkbox"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
                className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span>
                <strong>Force Delete:</strong> Cascade remove all {deletingStructure._count.postings} student fee postings associated with this structure.
              </span>
            </label>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingStructure(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              isLoading={deleteMutation.isPending}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
