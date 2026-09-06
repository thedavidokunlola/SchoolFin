"use client";

// src/components/views/bursar/BursarDebtCollectionView.tsx
// Debt Collection Rules Manager, Template Editor & Message History (Module G1, G2)

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, FileText, Bell, History } from "lucide-react";
import type { DebtStage, NotificationChannel } from "@prisma/client";

export function BursarDebtCollectionView() {
  const [activeTab, setActiveTab] = useState<"RULES" | "TEMPLATES" | "HISTORY">("RULES");

  // Rule Form State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleStage, setRuleStage] = useState<DebtStage>("REMINDER");
  const [ruleDaysOverdue, setRuleDaysOverdue] = useState<number>(7);
  const [ruleTemplateId, setRuleTemplateId] = useState<string>("");

  // Template Form State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateChannel, setTemplateChannel] = useState<NotificationChannel>("EMAIL");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: terms } = trpc.terms.getAll.useQuery();
  const activeTerm = terms?.find((t) => t.isActive);

  const { data: rules, isLoading: isRulesLoading } = trpc.debtCollection.getRules.useQuery({
    termId: activeTerm?.id,
  });
  const { data: templates, isLoading: isTemplatesLoading } = trpc.debtCollection.getTemplates.useQuery();
  const { data: eventHistory, isLoading: isHistoryLoading } = trpc.debtCollection.getEvents.useQuery({
    limit: 50,
  });

  const createRuleMutation = trpc.debtCollection.createRule.useMutation({
    onSuccess: () => {
      utils.debtCollection.getRules.invalidate();
      setIsRuleModalOpen(false);
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const createTemplateMutation = trpc.debtCollection.createTemplate.useMutation({
    onSuccess: () => {
      utils.debtCollection.getTemplates.invalidate();
      setIsTemplateModalOpen(false);
      setTemplateName("");
      setTemplateSubject("");
      setTemplateBody("");
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTerm) {
      setErrorMsg("No active term selected");
      return;
    }
    if (!ruleTemplateId) {
      setErrorMsg("Please select a communication template for this rule");
      return;
    }

    createRuleMutation.mutate({
      termId: activeTerm.id,
      stage: ruleStage,
      daysOverdue: Number(ruleDaysOverdue),
      templateId: ruleTemplateId,
    });
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplateMutation.mutate({
      name: templateName,
      channel: templateChannel,
      subject: templateSubject || undefined,
      body: templateBody,
      variables: ["student_name", "amount_due", "due_date", "payment_link"],
    });
  };

  const handleInsertVariable = (variableName: string) => {
    setTemplateBody((prev) => `${prev} {{${variableName}}}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Automated Debt Collection
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure trigger schedules, notification templates, and inspect scan logs (Module G1, G2).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsTemplateModalOpen(true)}
            className="gap-2 text-xs"
          >
            <FileText className="w-4 h-4" /> New Template
          </Button>
          <Button
            variant="accent"
            size="md"
            onClick={() => setIsRuleModalOpen(true)}
            className="gap-2 text-xs shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Collection Rule
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "RULES"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("RULES")}
        >
          Active Trigger Rules ({rules?.length || 0})
        </button>
        <button
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "TEMPLATES"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("TEMPLATES")}
        >
          Communication Templates ({templates?.length || 0})
        </button>
        <button
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "HISTORY"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("HISTORY")}
        >
          Recent Sent Event Log ({eventHistory?.length || 0})
        </button>
      </div>

      {/* TAB 1: RULES */}
      {activeTab === "RULES" && (
        <Card className="shadow-xs">
          <CardHeader className="py-4 px-6 border-b border-slate-100">
            <CardTitle className="text-sm">Active Rules for {activeTerm?.name || "Current Term"}</CardTitle>
            <CardDescription className="text-xs">
              Evaluated daily Mon–Fri at 08:00 WAT against outstanding student ledgers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Collection Stage</th>
                  <th className="p-4">Trigger Timing</th>
                  <th className="p-4">Channel</th>
                  <th className="p-4">Attached Template</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isRulesLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Loading rules...
                    </td>
                  </tr>
                ) : rules?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6">
                      <EmptyState
                        icon={<Bell className="w-6 h-6 text-[#2B35AF]" />}
                        title="No Automated Collection Rules"
                        description="Configure automated escalation rules to send gentle SMS and Email reminders to parents before and after the term fee due date."
                        actionLabel="Create First Debt Rule"
                        onAction={() => setIsRuleModalOpen(true)}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  rules?.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        <Badge variant="brand">{rule.stage}</Badge>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">
                        {rule.daysOverdue === 0
                          ? "On Due Date (0 days)"
                          : `${rule.daysOverdue} days after due date`}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={rule.template.channel === "SMS" ? "neutral" : "info"}
                        >
                          {rule.template.channel}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium text-slate-800">{rule.template.name}</td>
                      <td className="p-4">
                        <Badge variant="success">Active</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === "TEMPLATES" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isTemplatesLoading ? (
            <div className="col-span-2 p-8 text-center text-slate-400 text-xs">
              Loading templates...
            </div>
          ) : templates?.length === 0 ? (
            <div className="col-span-2">
              <EmptyState
                icon={<FileText className="w-6 h-6 text-[#2B35AF]" />}
                title="No Communication Templates"
                description="Customise SMS & Email message templates with dynamic placeholders like student name, balance, and online payment links."
                actionLabel="Create First Template"
                onAction={() => setIsTemplateModalOpen(true)}
              />
            </div>
          ) : (
            templates?.map((tmpl) => (
              <Card key={tmpl.id} className="p-5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">{tmpl.name}</h3>
                    <Badge variant={tmpl.channel === "SMS" ? "neutral" : "info"}>
                      {tmpl.channel}
                    </Badge>
                  </div>

                  {tmpl.subject && (
                    <p className="text-[11px] font-semibold text-slate-700 mt-2">
                      Subject: {tmpl.subject}
                    </p>
                  )}

                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 whitespace-pre-wrap">
                    {tmpl.body}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Variables: {tmpl.variables.join(", ")}</span>
                  <Badge variant="neutral">Ready</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {activeTab === "HISTORY" && (
        <Card className="shadow-xs">
          <CardHeader className="py-4 px-6 border-b border-slate-100">
            <CardTitle className="text-sm">Automated Event Log (Deduplicated Scans)</CardTitle>
            <CardDescription className="text-xs">
              Logged with unique ruleId to enforce 7-day deduplication window (Rule NOTIF-5)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Sent Time</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Channel</th>
                  <th className="p-4">Message Snippet</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isHistoryLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Loading event log...
                    </td>
                  </tr>
                ) : eventHistory?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6">
                      <EmptyState
                        icon={<History className="w-6 h-6 text-slate-500" />}
                        title="No Debt Messages Dispatched Yet"
                        description="When the daily automated 08:00 WAT debt scan runs, all dispatched SMS and Email reminders will be logged here with deduplication tracing."
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  eventHistory?.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {new Date(event.sentAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {event.student.firstName} {event.student.lastName}
                      </td>
                      <td className="p-4">
                        <Badge variant="brand">{event.stage}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={event.channel === "SMS" ? "neutral" : "info"}>
                          {event.channel}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs truncate">{event.message}</td>
                      <td className="p-4">
                        <Badge variant="success">{event.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Modal for Creating Rule */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Create Collection Trigger Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Collection Stage
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              value={ruleStage}
              onChange={(e) => setRuleStage(e.target.value as DebtStage)}
            >
              <option value="REMINDER">REMINDER (Gentle Notice)</option>
              <option value="ESCALATION">ESCALATION (Urgent Warning)</option>
              <option value="FINAL_NOTICE">FINAL NOTICE (Account Flagging)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Trigger Days (Relative to Due Date)
            </label>
            <Input
              type="number"
              required
              placeholder="e.g. 7 (triggers 7 days after due date)"
              value={ruleDaysOverdue}
              onChange={(e) => setRuleDaysOverdue(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Communication Template
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              value={ruleTemplateId}
              onChange={(e) => setRuleTemplateId(e.target.value)}
              required
            >
              <option value="">-- Choose a template --</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.channel})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={createRuleMutation.isPending}>
              Save Rule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal for Creating Template */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Create Communication Template"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          <Input
            label="Template Name"
            required
            placeholder="e.g. Friendly First Reminder SMS"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Channel</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              value={templateChannel}
              onChange={(e) => setTemplateChannel(e.target.value as NotificationChannel)}
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>

          {templateChannel === "EMAIL" && (
            <Input
              label="Email Subject Line"
              placeholder="e.g. School Fees Notice - {{student_name}}"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
            />
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Message Body</label>
              <span className="text-[10px] text-slate-400">Click to insert placeholder:</span>
            </div>

            {/* Placeholder Pills */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {["student_name", "amount_due", "due_date", "payment_link"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsertVariable(v)}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono hover:bg-emerald-100"
                >
                  + {`{{${v}}}`}
                </button>
              ))}
            </div>

            <textarea
              rows={5}
              required
              placeholder="Dear Parent, this is a reminder regarding {{student_name}}'s fees of ₦{{amount_due}} due on {{due_date}}..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 font-mono"
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              isLoading={createTemplateMutation.isPending}
            >
              Create Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
