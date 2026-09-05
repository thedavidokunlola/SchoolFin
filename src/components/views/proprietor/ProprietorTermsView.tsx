"use client";

// src/components/views/proprietor/ProprietorTermsView.tsx
// Academic terms management, payment due date configuration, edit & delete controls

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Edit2, Trash2, AlertTriangle, Calendar } from "lucide-react";

interface AcademicTermItem {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  paymentDueDate: Date | string | null;
  isActive: boolean;
  _count: {
    feeStructures: number;
    feePostings: number;
  };
}

export function ProprietorTermsView() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTermItem | null>(null);
  const [deletingTerm, setDeletingTerm] = useState<AcademicTermItem | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPaymentDueDate, setEditPaymentDueDate] = useState("");
  const [editIsActive, setEditIsActive] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: terms, isLoading } = trpc.terms.getAll.useQuery();

  const createTermMutation = trpc.terms.create.useMutation({
    onSuccess: () => {
      utils.terms.getAll.invalidate();
      setIsCreateModalOpen(false);
      setName("");
      setStartDate("");
      setEndDate("");
      setPaymentDueDate("");
      setIsActive(false);
    },
    onError: (err) => setFormError(err.message),
  });

  const updateTermMutation = trpc.terms.update.useMutation({
    onSuccess: () => {
      utils.terms.getAll.invalidate();
      setEditingTerm(null);
      setEditFormError(null);
    },
    onError: (err) => setEditFormError(err.message),
  });

  const deleteTermMutation = trpc.terms.delete.useMutation({
    onSuccess: () => {
      utils.terms.getAll.invalidate();
      setDeletingTerm(null);
      setDeleteError(null);
    },
    onError: (err) => setDeleteError(err.message),
  });

  const setActiveMutation = trpc.terms.setActive.useMutation({
    onSuccess: () => utils.terms.getAll.invalidate(),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createTermMutation.mutate({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
      isActive,
    });
  };

  const handleOpenEdit = (term: AcademicTermItem) => {
    setEditingTerm(term);
    setEditName(term.name);
    setEditStartDate(new Date(term.startDate).toISOString().split("T")[0]);
    setEditEndDate(new Date(term.endDate).toISOString().split("T")[0]);
    setEditPaymentDueDate(
      term.paymentDueDate
        ? new Date(term.paymentDueDate).toISOString().split("T")[0]
        : "",
    );
    setEditIsActive(term.isActive);
    setEditFormError(null);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm) return;
    setEditFormError(null);
    updateTermMutation.mutate({
      id: editingTerm.id,
      name: editName,
      startDate: new Date(editStartDate),
      endDate: new Date(editEndDate),
      paymentDueDate: editPaymentDueDate ? new Date(editPaymentDueDate) : null,
      isActive: editIsActive,
    });
  };

  const [forceDelete, setForceDelete] = useState(false);

  const handleDelete = () => {
    if (!deletingTerm) return;
    setDeleteError(null);
    deleteTermMutation.mutate({ id: deletingTerm.id, force: forceDelete });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Academic Term Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure academic sessions, active terms, payment due dates, and update/remove terms
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" /> Create Term
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 p-12 text-center text-xs text-slate-400">
            Loading terms...
          </div>
        ) : terms?.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="No Academic Terms Configured"
            description="To begin school fee operations, configure your first academic term with its start date, end date, and fee payment deadline."
            actionLabel="Create First Academic Term"
            onAction={() => setIsCreateModalOpen(true)}
            className="col-span-1 md:col-span-3"
          />
        ) : (
          terms?.map((term) => (
            <Card
              key={term.id}
              className={`shadow-xs flex flex-col justify-between ${
                term.isActive
                  ? "border-emerald-600 shadow-xs ring-2 ring-emerald-600/20"
                  : ""
              }`}
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{term.name}</CardTitle>
                    <Badge variant={term.isActive ? "success" : "neutral"}>
                      {term.isActive ? "Active Session" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Start Date:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(term.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">End Date:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(term.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-medium">
                        Payment Due Date:
                      </span>
                      <span className="font-bold text-slate-900">
                        {term.paymentDueDate
                          ? new Date(term.paymentDueDate).toLocaleDateString()
                          : "Not Set"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{term._count.feeStructures} Fee Structures</span>
                    <span>{term._count.feePostings} Postings</span>
                  </div>
                </CardContent>
              </div>

              {/* Card Actions */}
              <div className="p-4 pt-0 space-y-2">
                {!term.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveMutation.mutate({ id: term.id })}
                    isLoading={setActiveMutation.isPending}
                    className="w-full text-xs"
                  >
                    Set As Active Term
                  </Button>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(term)}
                    className="flex-1 gap-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Term
                  </Button>

                  {!term.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingTerm(term);
                        setDeleteError(null);
                      }}
                      className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Term Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Academic Term"
        description="Add a new academic session and set default deadlines"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Term Name (e.g. 2025/2026 First Term)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <Input
            label="Fee Payment Due Date (Anchor for Debt Engine)"
            type="date"
            value={paymentDueDate}
            onChange={(e) => setPaymentDueDate(e.target.value)}
            helperText="Required for automated debt collection and reminder schedules"
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600 focus:border-emerald-600"
            />
            <label
              htmlFor="isActiveCheck"
              className="text-xs font-semibold text-slate-700"
            >
              Set as currently active term immediately
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              isLoading={createTermMutation.isPending}
            >
              Create Term
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Term Modal */}
      {editingTerm && (
        <Modal
          isOpen={Boolean(editingTerm)}
          onClose={() => setEditingTerm(null)}
          title={`Edit Academic Term: ${editingTerm.name}`}
          description="Update session dates, payment deadline, or active status"
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            {editFormError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {editFormError}
              </div>
            )}

            <Input
              label="Term Name"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                required
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                required
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
              />
            </div>

            <Input
              label="Fee Payment Due Date"
              type="date"
              value={editPaymentDueDate}
              onChange={(e) => setEditPaymentDueDate(e.target.value)}
              helperText="Anchor date for automated debt collection rules"
            />

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editIsActiveCheck"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600 focus:border-emerald-600"
              />
              <label
                htmlFor="editIsActiveCheck"
                className="text-xs font-semibold text-slate-700"
              >
                Set as currently active term
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingTerm(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                isLoading={updateTermMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTerm && (
        <Modal
          isOpen={Boolean(deletingTerm)}
          onClose={() => {
            setDeletingTerm(null);
            setDeleteError(null);
            setForceDelete(false);
          }}
          title={`Delete Academic Term`}
        >
          <div className="space-y-4">
            {deleteError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {deleteError}
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Term Deletion Check</p>
                <p className="mt-0.5">
                  Are you sure you want to delete <strong>{deletingTerm.name}</strong>?
                </p>
                {(deletingTerm._count.feePostings > 0 ||
                  deletingTerm._count.feeStructures > 0) && (
                  <div className="mt-2 p-2 bg-amber-100/70 rounded-lg text-amber-950 font-medium">
                    This term currently contains{" "}
                    <strong>{deletingTerm._count.feePostings} fee posting(s)</strong> and{" "}
                    <strong>{deletingTerm._count.feeStructures} fee structure(s)</strong>.
                  </div>
                )}
              </div>
            </div>

            {(deletingTerm._count.feePostings > 0 ||
              deletingTerm._count.feeStructures > 0) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceDelete}
                    onChange={(e) => setForceDelete(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-red-600 focus:border-red-600"
                  />
                  <span className="text-xs font-semibold text-rose-900">
                    Enable Force Delete (Permanently cascade remove all linked fee structures, line items, installments, and fee postings)
                  </span>
                </label>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeletingTerm(null);
                  setDeleteError(null);
                  setForceDelete(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={deleteTermMutation.isPending}
                disabled={
                  (deletingTerm._count.feePostings > 0 ||
                    deletingTerm._count.feeStructures > 0) &&
                  !forceDelete
                }
                onClick={handleDelete}
              >
                {forceDelete ? "Force Delete Term" : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
