"use client";

// src/components/views/proprietor/ProprietorComplianceView.tsx
// NDPA Data Subject Access Requests and Right-to-be-Forgotten Center (Module J2, Rule AUDIT-3)

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ShieldCheck, Download, UserX, Search, AlertTriangle } from "lucide-react";

export function ProprietorComplianceView() {
  const [searchUserEmail, setSearchUserEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; name: string } | null>(null);

  const [isAnonymiseModalOpen, setIsAnonymiseModalOpen] = useState(false);
  const [anonymiseReason, setAnonymiseReason] = useState("");
  const [exportDataJson, setExportDataJson] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const { data: users } = trpc.users.listAll.useQuery();

  trpc.compliance.exportSubjectData.useQuery(
    { userId: selectedUser?.id || "" },
    {
      enabled: Boolean(selectedUser?.id && exportDataJson === "PENDING"),
      onSuccess: (data) => {
        setExportDataJson(JSON.stringify(data, null, 2));
      },
    },
  );

  const anonymiseMutation = trpc.compliance.anonymiseSubjectData.useMutation({
    onSuccess: () => {
      setActionNotice("Subject PII has been successfully anonymised per NDPA standards. Financial ledgers remain preserved.");
      setIsAnonymiseModalOpen(false);
      setSelectedUser(null);
      setAnonymiseReason("");
    },
  });

  const handleTriggerExport = (user: { id: string; email: string; name: string }) => {
    setSelectedUser(user);
    setExportDataJson("PENDING");
  };

  const handleDownloadExportJson = () => {
    if (!exportDataJson || exportDataJson === "PENDING") return;

    const blob = new Blob([exportDataJson], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NDPA_Subject_Export_${selectedUser?.email || "user"}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(searchUserEmail.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchUserEmail.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          NDPA Compliance & Data Subject Rights
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Process Data Subject Access Requests (DSAR) and Right to Erasure / Anonymisation under the Nigeria Data Protection Act (Module J2).
        </p>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <span>{actionNotice}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionNotice(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* User Search & Registry */}
      <Card className="shadow-xs">
        <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm">User Data Subject Registry</CardTitle>
            <CardDescription className="text-xs">
              Select a user to export portable PII records or execute irreversible anonymisation
            </CardDescription>
          </div>

          <div className="w-64 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search email or name..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              value={searchUserEmail}
              onChange={(e) => setSearchUserEmail(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">NDPA Subject Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers?.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="p-4 text-slate-600 font-mono">{user.email}</td>
                  <td className="p-4">
                    <Badge variant="brand">{user.role}</Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant={user.isActive ? "success" : "neutral"}>
                      {user.isActive ? "Active" : "Anonymised / Inactive"}
                    </Badge>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() =>
                        handleTriggerExport({
                          id: user.id,
                          email: user.email,
                          name: `${user.firstName} ${user.lastName}`,
                        })
                      }
                    >
                      <Download className="w-3.5 h-3.5" /> Export DSAR
                    </Button>

                    {user.isActive && (
                      <Button
                        variant="danger"
                        size="sm"
                        className="gap-1 text-xs shadow-xs"
                        onClick={() => {
                          setSelectedUser({
                            id: user.id,
                            email: user.email,
                            name: `${user.firstName} ${user.lastName}`,
                          });
                          setIsAnonymiseModalOpen(true);
                        }}
                      >
                        <UserX className="w-3.5 h-3.5" /> Anonymise
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Export Viewer Modal */}
      {exportDataJson && (
        <Modal
          isOpen={Boolean(exportDataJson)}
          onClose={() => setExportDataJson(null)}
          title={`Data Subject Access Export: ${selectedUser?.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Complete portable machine-readable records (financial logs, student links, and profile data).
            </p>

            {exportDataJson === "PENDING" ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Compiling structured JSON export...
              </div>
            ) : (
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] max-h-64 overflow-y-auto">
                {exportDataJson}
              </pre>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setExportDataJson(null)}>
                Close
              </Button>
              <Button
                variant="accent"
                disabled={exportDataJson === "PENDING"}
                onClick={handleDownloadExportJson}
                className="gap-1.5 shadow-xs"
              >
                <Download className="w-4 h-4" /> Download JSON
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Anonymise Confirmation Modal */}
      <Modal
        isOpen={isAnonymiseModalOpen}
        onClose={() => setIsAnonymiseModalOpen(false)}
        title="Confirm NDPA Right-to-be-Forgotten Anonymisation"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedUser) return;
            anonymiseMutation.mutate({
              userId: selectedUser.id,
              reason: anonymiseReason,
            });
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold">Irreversible Compliance Action</p>
              <p className="mt-0.5">
                This will redact all PII (name, phone, email) for <strong>{selectedUser?.name}</strong>. Historical financial ledgers and receipts will remain intact with an anonymous pointer (Rule AUDIT-5).
              </p>
            </div>
          </div>

          <Input
            label="Legal / Erasure Reason"
            required
            placeholder="e.g. Formal NDPA Article 34 Data Subject Erasure Request"
            value={anonymiseReason}
            onChange={(e) => setAnonymiseReason(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAnonymiseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={anonymiseMutation.isPending}
            >
              Confirm Anonymisation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
