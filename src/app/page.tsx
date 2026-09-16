import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { ROLE_DASHBOARDS, type UserRole } from "@/lib/constants";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role) {
    const role = session.user.role as UserRole;
    const dashboard = ROLE_DASHBOARDS[role] || "/login";
    redirect(dashboard);
  }

  // Check if school has been initialized
  const proprietorCount = await prisma.user.count({
    where: { role: "PROPRIETOR" },
  });

  if (proprietorCount === 0) {
    redirect("/setup");
  }

  redirect("/login");
}

