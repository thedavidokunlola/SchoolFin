// src/app/api/reports/debtors/route.ts
// Download Debtor List Excel export (GET)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateDebtorListWorkbook } from "@/server/services/reports/debtor-list-export";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !["BURSAR", "ACCOUNTANT", "PROPRIETOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const termId = searchParams.get("termId") || undefined;
  const selectedClass = searchParams.get("class") || undefined;
  const minAmount = searchParams.get("minAmount")
    ? Number(searchParams.get("minAmount"))
    : undefined;
  const minOverdueDays = searchParams.get("minOverdueDays")
    ? Number(searchParams.get("minOverdueDays"))
    : undefined;

  try {
    const { buffer, fileName } = await generateDebtorListWorkbook({
      termId,
      class: selectedClass,
      minAmount,
      minOverdueDays,
    });

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Debtor export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate debtor export" },
      { status: 500 },
    );
  }
}
