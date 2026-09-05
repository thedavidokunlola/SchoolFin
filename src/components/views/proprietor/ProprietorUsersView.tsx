"use client";

// src/components/views/proprietor/ProprietorUsersView.tsx
// Proprietor staff account management view

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { UserPlus } from "lucide-react";

export function ProprietorUsersView() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"BURSAR" | "ACCOUNTANT" | "PROPRIETOR">("BURSAR");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: staff, isLoading } = trpc.users.listStaff.useQuery();

  const createStaffMutation = trpc.users.createStaff.useMutation({
    onSuccess: () => {
      utils.users.listStaff.invalidate();
      setIsCreateModalOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setPassword("");
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const deactivateMutation = trpc.users.deactivate.useMutation({
    onSuccess: () => {
      utils.users.listStaff.invalidate();
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createStaffMutation.mutate({
      email,
      firstName,
      lastName,
      role,
      phone: phone || undefined,
      password: password || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Staff Account Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and manage Bursar, Accountant, and Proprietor users
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto gap-2 shadow-xs"
        >
          <UserPlus className="w-4 h-4" /> Add Staff Account
        </Button>
      </div>

      {/* Staff Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading staff accounts...
                  </td>
                </tr>
              ) : staff?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                staff?.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="p-4 text-slate-600 font-mono">{user.email}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          user.role === "PROPRIETOR"
                            ? "brand"
                            : user.role === "BURSAR"
                            ? "info"
                            : "warning"
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-500">{user.phone || "—"}</td>
                    <td className="p-4">
                      <Badge variant={user.isActive ? "success" : "danger"}>
                        {user.isActive ? "Active" : "Deactivated"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {user.isActive && user.role !== "PROPRIETOR" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`,
                              )
                            ) {
                              deactivateMutation.mutate({ id: user.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                        >
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create Staff Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Staff Account"
        description="Provision a new internal role for the school"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {formError}
            </div>
          )}

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

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "BURSAR" | "ACCOUNTANT" | "PROPRIETOR")
              }
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            >
              <option value="BURSAR">Bursar (Full Cash & Posting Operations)</option>
              <option value="ACCOUNTANT">Accountant (Read-Only & Financial Reports)</option>
              <option value="PROPRIETOR">Proprietor (Full Administration)</option>
            </select>
          </div>

          <Input
            label="Phone Number (Optional - Encrypted AES-256)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08012345678"
          />

          <Input
            label="Initial Password (Optional - defaults to SchoolFin@123)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

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
              isLoading={createStaffMutation.isPending}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
