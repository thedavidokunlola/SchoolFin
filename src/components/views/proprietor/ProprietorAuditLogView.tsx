"use client";

// src/components/views/proprietor/ProprietorAuditLogView.tsx
// Immutable Audit Log Viewer (Module J1 / Rule AUDIT-1..AUDIT-6)

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShieldCheck, AlertTriangle, FileText } from "lucide-react";

export function ProprietorAuditLogView() {
  const [isSensitiveOnly, setIsSensitiveOnly] = useState(false);

  const { data, isLoading } = trpc.auditLog.getAll.useQuery({
    isSensitiveOnly: isSensitiveOnly ? true : undefined,
    take: 50,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-slate-800" />
            System Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only, immutable transaction ledger. All system actions are timestamped and attributed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isSensitiveOnly ? "accent" : "outline"}
            size="sm"
            onClick={() => setIsSensitiveOnly(!isSensitiveOnly)}
            className="gap-2 text-xs shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {isSensitiveOnly ? "Showing Sensitive Only" : "Filter Sensitive Actions"}
          </Button>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Sensitivity</th>
                <th className="p-4">Metadata Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading audit entries...
                  </td>
                </tr>
              ) : data?.logs?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    {isSensitiveOnly ? (
                      <EmptyState
                        icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
                        title="No Sensitive Actions Found"
                        description="There are currently no sensitive actions (such as manual credits, role alterations, or waivers) recorded in the audit trail."
                        actionLabel="Show All Audit Logs"
                        onAction={() => setIsSensitiveOnly(false)}
                        compact
                      />
                    ) : (
                      <EmptyState
                        icon={<FileText className="w-6 h-6 text-slate-500" />}
                        title="Audit Log is Empty"
                        description="All administrative, payment, and fee posting events will be immutably recorded here with exact actor attribution and timestamp."
                        compact
                      />
                    )}
                  </td>
                </tr>
              ) : (
                data?.logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="p-4">
                      {log.user ? (
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {log.user.firstName} {log.user.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.user.email} ({log.user.role})
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400 text-[11px]">
                          {log.userId}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                      {log.entity} <span className="font-mono text-[10px] text-slate-400">#{log.entityId.slice(-6)}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={log.isSensitive ? "danger" : "neutral"}>
                        {log.isSensitive ? "SENSITIVE" : "Standard"}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
