"use client";

// src/components/receipt/CashReceiptTemplate.tsx
// Official A5 Portrait Receipt Template per PRD §6.9 & Module D1

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { schoolConfig } from "../../../school.config";

export interface ReceiptData {
  receiptNumber: string;
  issuedAt: Date | string;
  method: string;
  amount: string | number;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    class: string;
  };
  manualCredit?: {
    description: string;
    referenceNote?: string | null;
    recordedBy?: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
  payment?: {
    flutterwaveRef?: string | null;
    channel?: string | null;
  } | null;
}

export const CashReceiptTemplate = React.forwardRef<
  HTMLDivElement,
  { data: ReceiptData }
>(({ data }, ref) => {
  const dateObj = new Date(data.issuedAt);
  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const formattedAmount = Number(data.amount).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = `${origin}/verify/receipt/${encodeURIComponent(data.receiptNumber)}`;

  const recordedByName = data.manualCredit?.recordedBy
    ? `${data.manualCredit.recordedBy.firstName} ${data.manualCredit.recordedBy.lastName}`
    : "School Bursar";

  return (
    <div
      ref={ref}
      className="printable-receipt-area bg-white text-slate-900 mx-auto p-8 font-sans"
      style={{
        width: "148mm",
        minHeight: "210mm",
        boxSizing: "border-box",
      }}
    >
      {/* Header Zone */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {schoolConfig.name}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">{schoolConfig.address}</p>
          <p className="text-xs text-slate-600">Tel: {schoolConfig.phone}</p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-bold tracking-wider rounded-md">
            BURSARY DEPARTMENT
          </span>
        </div>
      </div>

      <hr className="border-t-2 border-slate-900 my-2" />

      {/* Receipt Title */}
      <div className="text-center py-2">
        <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">
          Official Payment Receipt
        </h2>
      </div>

      {/* Metadata Table */}
      <div className="grid grid-cols-2 gap-4 py-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500 font-medium">Receipt No:</span>
            <span className="font-bold text-slate-900 font-mono">
              {data.receiptNumber}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500 font-medium">Payment Date:</span>
            <span className="font-semibold text-slate-800">{formattedDate}</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500 font-medium">Method:</span>
            <span className="font-semibold text-slate-800 uppercase">
              {data.method}
            </span>
          </div>
          {data.payment?.flutterwaveRef && (
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500 font-medium">Transaction Ref:</span>
              <span className="font-mono text-slate-700 text-[10px]">
                {data.payment.flutterwaveRef}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Student Details */}
      <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden text-xs">
        <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
          Student Information
        </div>
        <div className="p-3 grid grid-cols-3 gap-2">
          <div>
            <span className="text-slate-500 block text-[10px]">Student Name</span>
            <span className="font-bold text-slate-900">
              {data.student.firstName} {data.student.lastName}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Admission No</span>
            <span className="font-semibold text-slate-800 font-mono">
              {data.student.admissionNumber}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Class</span>
            <span className="font-semibold text-slate-800">{data.student.class}</span>
          </div>
        </div>
      </div>

      {/* Payment Details Table */}
      <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-2.5">Description</th>
              <th className="p-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="p-3 text-slate-800 font-medium">
                {data.manualCredit?.description || "School Fees Payment"}
                {data.manualCredit?.referenceNote && (
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Ref: {data.manualCredit.referenceNote}
                  </span>
                )}
              </td>
              <td className="p-3 text-right font-bold text-slate-900">
                {formattedAmount}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-300">
              <th className="p-3 text-slate-900 font-bold uppercase text-[11px]">
                Total Paid
              </th>
              <th className="p-3 text-right text-sm font-extrabold text-slate-900">
                {formattedAmount}
              </th>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Zone */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex items-end justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Recorded by:</span> {recordedByName}
          </p>
          <p className="text-[10px] text-slate-400 italic">
            This is an official receipt. Keep for your records.
          </p>
          <p className="text-[9px] text-slate-400 font-mono mt-1">
            Verification: {verifyUrl}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="p-1.5 bg-white border border-slate-300 rounded-lg shadow-2xs">
            <QRCodeSVG value={verifyUrl} size={64} />
          </div>
          <span className="text-[9px] text-slate-400 font-medium mt-1">
            Scan to Verify
          </span>
        </div>
      </div>
    </div>
  );
});

CashReceiptTemplate.displayName = "CashReceiptTemplate";
