// src/app/page.tsx
// Root route: Automatically redirects to role-based dashboard if authenticated, or directly to /login

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLE_DASHBOARDS, type UserRole } from "@/lib/constants";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role) {
    const role = session.user.role as UserRole;
    const dashboard = ROLE_DASHBOARDS[role] || "/login";
    redirect(dashboard);
  }

  redirect("/login");
}
