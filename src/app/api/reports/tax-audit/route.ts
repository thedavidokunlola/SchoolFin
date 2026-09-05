// src/app/api/reports/tax-audit/route.ts
// Download Tax Audit Excel export (GET) with 25s timeout fallback

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleTaxAuditExportRequest } from "@/server/services/reports/tax-audit-export";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !["ACCOUNTANT", "PROPRIETOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const termId = searchParams.get("termId") || undefined;

  try {
    const result = await handleTaxAuditExportRequest({
      termId,
      requestingUserId: session.user.id,
      requestingUserEmail: session.user.email,
    });

    if (result.type === "deferred") {
      return NextResponse.json(
        {
          deferred: true,
          message: result.message,
        },
        { status: 202 },
      );
    }

    return new Response(result.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    console.error("Tax audit export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate tax audit export" },
      { status: 500 },
    );
  }
}
