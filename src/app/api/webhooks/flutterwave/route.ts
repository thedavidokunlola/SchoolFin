// src/app/api/webhooks/flutterwave/route.ts
// Asynchronous Flutterwave Webhook Handler (POST only)
// Locked per Rule PAY-1, PAY-2, PAY-3, AUDIT-4, and PRD §6.4

import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { paymentsQueue } from "@/server/jobs/queues";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("verif-hash");

    // Rule PAY-1: Verify secret hash header
    if (!signature || signature !== config.flutterwave.secretHash) {
      return NextResponse.json(
        { error: "Unauthorized webhook signature" },
        { status: 401 },
      );
    }

    const rawPayload = await req.json();

    // Rule AUDIT-4: Store all raw webhook payloads in AuditLog metadata before processing
    const txRef = rawPayload.data?.tx_ref || rawPayload.txRef || "unknown_tx_ref";

    await writeAuditLog({
      userId: "flutterwave_webhook",
      action: AUDIT_ACTIONS.WEBHOOK_RECEIVED,
      entity: "WebhookPayload",
      entityId: txRef,
      metadata: { rawPayload },
      isSensitive: false,
    });

    // Rule PAY-2: Enqueue job and return 200 immediately
    await paymentsQueue.add("process-flw-webhook", {
      payload: rawPayload,
    });

    return NextResponse.json({ status: "queued" }, { status: 200 });
  } catch (error) {
    console.error("Flutterwave webhook error:", error);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
