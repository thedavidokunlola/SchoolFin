"use client";

// src/components/views/bursar/BursarStudentsView.tsx
// Bursar student roster, enrollment, edit/deactivate, delete, and parent invitation management

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SCHOOL_CLASSES } from "@/lib/constants";
import {
  Search,
  UserPlus,
  ChevronRight,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface StudentListItem {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  class: string;
  isActive: boolean;
  parentLinks?: {
    parent?: {
      id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    };
  }[];
}

export function BursarStudentsView() {
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false);
  const [isInviteParentOpen, setIsInviteParentOpen] = useState(false);
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Student Enrollment Form
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentClass, setStudentClass] = useState<string>(SCHOOL_CLASSES[0]);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);

  // Student Edit Form
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null);
  const [editAdmissionNumber, setEditAdmissionNumber] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Student Deletion Form
  const [deletingStudent, setDeletingStudent] = useState<StudentListItem | null>(null);
  const [forceDeleteStudent, setForceDeleteStudent] = useState(false);
  const [deleteStudentError, setDeleteStudentError] = useState<string | null>(null);

  // Parent Form
  const [parentEmail, setParentEmail] = useState("");
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [relationship, setRelationship] = useState("Parent");
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [parentFormError, setParentFormError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.students.getAll.useQuery({
    search: search || undefined,
    class: selectedClass || undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
  });

  const createStudentMutation = trpc.students.create.useMutation({
    onSuccess: () => {
      utils.students.getAll.invalidate();
      setIsCreateStudentOpen(false);
      setAdmissionNumber("");
      setFirstName("");
      setLastName("");
      setStudentClass(SCHOOL_CLASSES[0]);
      setStudentFormError(null);
    },
    onError: (err) => {
      setStudentFormError(err.message);
    },
  });

  const updateStudentMutation = trpc.students.update.useMutation({
    onSuccess: () => {
      utils.students.getAll.invalidate();
      setEditingStudent(null);
      setEditFormError(null);
    },
    onError: (err) => {
      setEditFormError(err.message);
    },
  });

  const deleteStudentMutation = trpc.students.delete.useMutation({
    onSuccess: () => {
      utils.students.getAll.invalidate();
      setDeletingStudent(null);
      setDeleteStudentError(null);
      setForceDeleteStudent(false);
    },
    onError: (err) => {
      setDeleteStudentError(err.message);
    },
  });

  const inviteParentMutation = trpc.parents.create.useMutation({
    onSuccess: (data) => {
      utils.students.getAll.invalidate();
      if (data.inviteToken) {
        const link = `${window.location.origin}/accept-invite?token=${data.inviteToken}`;
        setGeneratedInviteLink(link);
      }
      setParentEmail("");
      setParentFirstName("");
      setParentLastName("");
      setParentPhone("");
      setParentFormError(null);
    },
    onError: (err) => {
      setParentFormError(err.message);
    },
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentFormError(null);
    createStudentMutation.mutate({
      admissionNumber,
      firstName,
      lastName,
      class: studentClass,
    });
  };

  const handleOpenEdit = (student: StudentListItem) => {
    setEditingStudent(student);
    setEditAdmissionNumber(student.admissionNumber);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditClass(student.class);
    setEditIsActive(student.isActive);
    setEditFormError(null);
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditFormError(null);
    updateStudentMutation.mutate({
      id: editingStudent.id,
      admissionNumber: editAdmissionNumber,
      firstName: editFirstName,
      lastName: editLastName,
      class: editClass,
      isActive: editIsActive,
    });
  };

  const handleDeleteStudent = () => {
    if (!deletingStudent) return;
    setDeleteStudentError(null);
    deleteStudentMutation.mutate({
      id: deletingStudent.id,
      force: forceDeleteStudent,
    });
  };

  const handleInviteParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForParent) return;
    setParentFormError(null);
    inviteParentMutation.mutate({
      email: parentEmail,
      firstName: parentFirstName,
      lastName: parentLastName,
      phone: parentPhone || undefined,
      studentId: selectedStudentForParent.id,
      relationship,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Student Accounts & Ledgers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student registrations, profile details, parent links, and ledger histories
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => setIsCreateStudentOpen(true)}
          className="w-full sm:w-auto gap-2 shadow-xs"
        >
          <UserPlus className="w-4 h-4" /> Enroll Student
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or admission number..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs transition-all"
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

      {/* Students Table */}
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
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading students...
                  </td>
                </tr>
              ) : data?.students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No students found matching query.
                  </td>
                </tr>
              ) : (
                data?.students.map((student) => {
                  const linkedParent = student.parentLinks[0]?.parent;
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
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
                      <td className="p-4">
                        {linkedParent ? (
                          <span className="text-slate-700 font-medium">
                            {linkedParent.firstName} {linkedParent.lastName} (
                            {linkedParent.email})
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedStudentForParent({
                                id: student.id,
                                name: `${student.firstName} ${student.lastName}`,
                              });
                              setGeneratedInviteLink(null);
                              setIsInviteParentOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold hover:underline"
                          >
                            <LinkIcon className="w-3 h-3" /> Link Parent
                          </button>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={student.isActive ? "success" : "danger"}>
                          {student.isActive ? "Active" : "Inactive / Left"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/bursar/students/${student.id}`}>
                            <Button variant="outline" size="sm" className="gap-1 text-xs">
                              Financial Profile <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit Student Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingStudent(student);
                              setDeleteStudentError(null);
                              setForceDeleteStudent(false);
                            }}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Enroll Student Modal */}
      <Modal
        isOpen={isCreateStudentOpen}
        onClose={() => setIsCreateStudentOpen(false)}
        title="Enroll New Student"
        description="Add a student to the school register"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {studentFormError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {studentFormError}
            </div>
          )}

          <Input
            label="Admission Number (Unique)"
            required
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="e.g. GWA/2026/042"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Class</label>
            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            >
              {SCHOOL_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateStudentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              isLoading={createStudentMutation.isPending}
            >
              Enroll Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      {editingStudent && (
        <Modal
          isOpen={Boolean(editingStudent)}
          onClose={() => setEditingStudent(null)}
          title={`Edit Student: ${editingStudent.firstName} ${editingStudent.lastName}`}
          description="Update student details, change class, or toggle active/left status"
        >
          <form onSubmit={handleUpdateStudent} className="space-y-4">
            {editFormError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {editFormError}
              </div>
            )}

            <Input
              label="Admission Number"
              required
              value={editAdmissionNumber}
              onChange={(e) => setEditAdmissionNumber(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
              />
              <Input
                label="Last Name"
                required
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Class</label>
              <select
                value={editClass}
                onChange={(e) => setEditClass(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              >
                {SCHOOL_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-800 block">
                Enrollment Status
              </label>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="studentStatus"
                    checked={editIsActive}
                    onChange={() => setEditIsActive(true)}
                    className="text-emerald-600 focus:ring-emerald-600"
                  />
                  Active (Currently Enrolled)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="studentStatus"
                    checked={!editIsActive}
                    onChange={() => setEditIsActive(false)}
                    className="text-red-600 focus:ring-red-600"
                  />
                  Inactive / Left School
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingStudent(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                isLoading={updateStudentMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Student Modal */}
      {deletingStudent && (
        <Modal
          isOpen={Boolean(deletingStudent)}
          onClose={() => {
            setDeletingStudent(null);
            setDeleteStudentError(null);
            setForceDeleteStudent(false);
          }}
          title="Delete Student Record"
        >
          <div className="space-y-4">
            {deleteStudentError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {deleteStudentError}
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Student Record Deletion</p>
                <p className="mt-0.5">
                  Are you sure you want to delete{" "}
                  <strong>
                    {deletingStudent.firstName} {deletingStudent.lastName}
                  </strong>{" "}
                  ({deletingStudent.admissionNumber})?
                </p>
                <p className="mt-1 text-[11px] text-amber-700">
                  Tip: If the student simply graduated or left the school, we recommend editing their status to <strong>Inactive / Left School</strong> instead of deleting them so historical payment receipts remain verifiable.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceDeleteStudent}
                  onChange={(e) => setForceDeleteStudent(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-red-600 focus:border-red-600"
                />
                <span className="text-xs font-semibold text-rose-900">
                  Force Delete (Permanently remove student account along with any linked test fee postings, payments, receipts, and parent links)
                </span>
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeletingStudent(null);
                  setDeleteStudentError(null);
                  setForceDeleteStudent(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={deleteStudentMutation.isPending}
                onClick={handleDeleteStudent}
              >
                {forceDeleteStudent ? "Force Delete Student" : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invite/Link Parent Modal */}
      <Modal
        isOpen={isInviteParentOpen}
        onClose={() => setIsInviteParentOpen(false)}
        title={`Link Parent for ${selectedStudentForParent?.name}`}
        description="Generate a single-use onboarding invite link for the parent"
      >
        <form onSubmit={handleInviteParent} className="space-y-4">
          {parentFormError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {parentFormError}
            </div>
          )}

          {generatedInviteLink ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Invite Link
                Generated Successfully!
              </div>
              <p className="text-[11px] text-emerald-700">
                Send this link to the parent. It is single-use and expires in 48
                hours.
              </p>
              <div className="flex items-center gap-2 bg-white p-2 border border-emerald-300 rounded-lg">
                <input
                  type="text"
                  readOnly
                  value={generatedInviteLink}
                  className="w-full text-xs font-mono bg-transparent border-none outline-none text-slate-800"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInviteLink);
                    alert("Invite link copied to clipboard!");
                  }}
                  className="gap-1 text-xs"
                >
                  <Copy className="w-3 h-3" /> Copy
                </Button>
              </div>
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={() => setIsInviteParentOpen(false)}
                className="w-full mt-2"
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <Input
                label="Parent Email Address"
                type="email"
                required
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Parent First Name"
                  required
                  value={parentFirstName}
                  onChange={(e) => setParentFirstName(e.target.value)}
                />
                <Input
                  label="Parent Last Name"
                  required
                  value={parentLastName}
                  onChange={(e) => setParentLastName(e.target.value)}
                />
              </div>

              <Input
                label="Phone Number (Encrypted AES-256)"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="08012345678"
              />

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Parent">Parent</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsInviteParentOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  isLoading={inviteParentMutation.isPending}
                >
                  Create & Generate Invite Link
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
