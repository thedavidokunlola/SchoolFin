"use client";

// src/components/layout/DashboardLayout.tsx
// Shared navigation layout with sidebar, role indicator, and in-app alert banner
// Locked per Rule NOTIF-2

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { schoolConfig } from "../../../school.config";
import { Badge } from "@/components/ui/Badge";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Receipt,
  FileText,
  Settings,
  LogOut,
  Calendar,
  ShieldCheck,
  CreditCard,
  FileSpreadsheet,
  MessageSquare,
  UserX,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  tabKey: string;
  icon: React.ReactNode;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: meData } = trpc.auth.me.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const role = meData?.role || session?.user?.role;
  const displayName = meData
    ? `${meData.firstName} ${meData.lastName}`
    : session?.user
    ? `${session.user.firstName} ${session.user.lastName}`
    : "";
  const displayEmail = meData?.email || session?.user?.email || "";

  const navItemsByRole: Record<string, NavItem[]> = {
    PROPRIETOR: [
      {
        label: "Dashboard",
        href: "/proprietor/dashboard",
        tabKey: "overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
      {
        label: "Staff Accounts",
        href: "/proprietor/dashboard?tab=users",
        tabKey: "users",
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: "Academic Terms",
        href: "/proprietor/dashboard?tab=terms",
        tabKey: "terms",
        icon: <Calendar className="w-4 h-4" />,
      },
      {
        label: "Audit Log",
        href: "/proprietor/dashboard?tab=audit-log",
        tabKey: "audit-log",
        icon: <ShieldCheck className="w-4 h-4" />,
      },
      {
        label: "NDPA Compliance",
        href: "/proprietor/dashboard?tab=compliance",
        tabKey: "compliance",
        icon: <UserX className="w-4 h-4" />,
      },
      {
        label: "Profile & Settings",
        href: "/proprietor/dashboard?tab=profile",
        tabKey: "profile",
        icon: <Settings className="w-4 h-4" />,
      },
    ],
    BURSAR: [
      {
        label: "Dashboard",
        href: "/bursar/dashboard",
        tabKey: "overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
      {
        label: "Students",
        href: "/bursar/dashboard?tab=students",
        tabKey: "students",
        icon: <GraduationCap className="w-4 h-4" />,
      },
      {
        label: "Debtor List",
        href: "/bursar/dashboard?tab=debtors",
        tabKey: "debtors",
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: "Fee Structures",
        href: "/bursar/dashboard?tab=fees",
        tabKey: "fees",
        icon: <FileText className="w-4 h-4" />,
      },
      {
        label: "Post Fees",
        href: "/bursar/dashboard?tab=post",
        tabKey: "post",
        icon: <CreditCard className="w-4 h-4" />,
      },
      {
        label: "Installment Plans",
        href: "/bursar/dashboard?tab=installments",
        tabKey: "installments",
        icon: <Calendar className="w-4 h-4" />,
      },
      {
        label: "Record Cash Payment",
        href: "/bursar/dashboard?tab=cash",
        tabKey: "cash",
        icon: <Receipt className="w-4 h-4" />,
      },
      {
        label: "Debt Collection",
        href: "/bursar/dashboard?tab=debt-collection",
        tabKey: "debt-collection",
        icon: <MessageSquare className="w-4 h-4" />,
      },
      {
        label: "Income Reports",
        href: "/bursar/dashboard?tab=reports",
        tabKey: "reports",
        icon: <FileSpreadsheet className="w-4 h-4" />,
      },
    ],
    ACCOUNTANT: [
      {
        label: "Dashboard",
        href: "/accountant/dashboard",
        tabKey: "overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
      {
        label: "Student Accounts",
        href: "/accountant/dashboard?tab=students",
        tabKey: "students",
        icon: <GraduationCap className="w-4 h-4" />,
      },
      {
        label: "Tax & Financial Reports",
        href: "/accountant/dashboard?tab=reports",
        tabKey: "reports",
        icon: <FileSpreadsheet className="w-4 h-4" />,
      },
    ],
    PARENT: [
      {
        label: "Dashboard",
        href: "/parent/dashboard",
        tabKey: "overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
    ],
  };

  const navItems = role ? navItemsByRole[role] || [] : [];

  const roleVariant =
    role === "PROPRIETOR"
      ? "brand"
      : role === "BURSAR"
      ? "info"
      : role === "ACCOUNTANT"
      ? "warning"
      : "success";

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white text-slate-900 flex flex-col border-r border-slate-200/90 shadow-2xs shrink-0">
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-extrabold text-sm tracking-tight leading-tight text-slate-900">
              {schoolConfig.name}
            </h1>
            <span className="text-[10px] text-[#2B35AF] font-bold tracking-wide uppercase leading-tight">
              Finance & Fee Portal
            </span>
          </div>
        </div>

        {/* User Profile Mini Bar */}
        {session?.user && (
          <div
            onClick={() => {
              if (role === "PROPRIETOR" && onTabChange) {
                onTabChange("profile");
              }
            }}
            className={`px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 transition-colors ${
              role === "PROPRIETOR" ? "cursor-pointer hover:bg-slate-100/90" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {displayEmail}
                </p>
              </div>
              <Badge variant={roleVariant} className="text-[10px] px-2 py-0.5 font-bold uppercase">
                {role}
              </Badge>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab
              ? item.tabKey === activeTab
              : pathname === item.href.split("?")[0];

            return (
              <Link
                key={item.tabKey || item.href}
                href={item.href}
                onClick={(e) => {
                  if (onTabChange && item.tabKey) {
                    e.preventDefault();
                    onTabChange(item.tabKey);
                  }
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[#EEF1FF] text-[#2B35AF] border border-[#DBE1FF] shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={async () => {
              await signOut({ redirect: false, callbackUrl: "/login" });
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top Header Bar with Spacious & Clean Layout */}
        <header className="h-16 min-h-[64px] bg-white border-b border-slate-200/90 px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0">
          {/* Left: Role Title */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
              {role?.toLowerCase()} portal
            </span>
          </div>

          {/* Right: Currency & Timezone Badges with Spacious Padding */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
              <CreditCard className="w-3.5 h-3.5 text-[#2B35AF]" />
              <span>Currency:</span>
              <strong className="text-slate-900 font-bold">{schoolConfig.currency}</strong>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Timezone:</span>
              <strong className="text-slate-900 font-bold">{schoolConfig.timezone}</strong>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
