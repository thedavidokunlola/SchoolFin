"use client";

// src/components/layout/DashboardLayout.tsx
// Shared navigation layout with sidebar, role indicator, and in-app alert banner
// Locked per Rule NOTIF-2

import React, { useState } from "react";
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
  X,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        label: "Fee Posting",
        href: "/bursar/dashboard?tab=posting",
        tabKey: "posting",
        icon: <Receipt className="w-4 h-4" />,
      },
      {
        label: "Cash & Manual Credits",
        href: "/bursar/dashboard?tab=cash",
        tabKey: "cash",
        icon: <Receipt className="w-4 h-4" />,
      },
      {
        label: "Installment Plans",
        href: "/bursar/dashboard?tab=installments",
        tabKey: "installments",
        icon: <Calendar className="w-4 h-4" />,
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
  const roleVariant: "brand" | "info" | "warning" | "success" =
    role === "PROPRIETOR"
      ? "brand"
      : role === "BURSAR"
      ? "info"
      : role === "ACCOUNTANT"
      ? "warning"
      : "success";

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-extrabold text-sm tracking-tight leading-tight text-slate-900">
            {schoolConfig.name}
          </h1>
          <span className="text-[10px] text-[#2B35AF] font-bold tracking-wide uppercase leading-tight">
            Finance & Fee Portal
          </span>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Profile Mini Bar */}
      {session?.user && (
        <div
          onClick={() => {
            if (role === "PROPRIETOR" && onTabChange) {
              onTabChange("profile");
              if (isMobile) setIsMobileMenuOpen(false);
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
            <Badge variant={roleVariant} className="text-[10px] px-2 py-0.5 font-bold uppercase shrink-0">
              {role}
            </Badge>
          </div>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab ? activeTab === item.tabKey : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (onTabChange) {
                  e.preventDefault();
                  onTabChange(item.tabKey);
                  if (isMobile) setIsMobileMenuOpen(false);
                }
              }}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#2B35AF] text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-3.5 border-t border-slate-100">
        <button
          type="button"
          onClick={async () => {
            await signOut({ callbackUrl: "/login", redirect: false });
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50/80 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Desktop Sidebar (100% untouched on md+) */}
      <aside className="hidden md:flex md:w-64 bg-white text-slate-900 flex-col border-r border-slate-200/90 shadow-2xs shrink-0">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white text-slate-900 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top Header Bar */}
        <header className="h-16 min-h-[64px] bg-white border-b border-slate-200/90 px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0">
          {/* Left: Mobile Toggle & Role Title */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
                {role?.toLowerCase()} portal
              </span>
            </div>
          </div>

          {/* Right: Currency & Timezone Badges */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
              <CreditCard className="w-3.5 h-3.5 text-[#2B35AF]" />
              <span className="hidden xs:inline">Currency:</span>
              <strong className="text-slate-900 font-bold">{schoolConfig.currency}</strong>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
              <span className="hidden sm:inline">Timezone:</span>
              <strong className="text-slate-900 font-bold text-[11px] sm:text-xs">{schoolConfig.timezone}</strong>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
