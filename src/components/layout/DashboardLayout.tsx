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
  category: string;
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
  const { data: terms } = trpc.terms.getAll.useQuery();
  const activeTerm = terms?.find((t) => t.isActive);

  const role = meData?.role || session?.user?.role;
  const displayName = meData
    ? `${meData.firstName} ${meData.lastName}`
    : session?.user
    ? `${session.user.firstName} ${session.user.lastName}`
    : "User";

  const navItemsByRole: Record<string, NavItem[]> = {
    PROPRIETOR: [
      {
        label: "Dashboard",
        href: "/proprietor/dashboard",
        tabKey: "overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: "MANAGE",
      },
      {
        label: "Staff Accounts",
        href: "/proprietor/dashboard?tab=users",
        tabKey: "users",
        icon: <Users className="w-4 h-4" />,
        category: "MANAGE",
      },
      {
        label: "Academic Terms",
        href: "/proprietor/dashboard?tab=terms",
        tabKey: "terms",
        icon: <Calendar className="w-4 h-4" />,
        category: "MANAGE",
      },
      {
        label: "Audit Trail",
        href: "/proprietor/dashboard?tab=audit-log",
        tabKey: "audit-log",
        icon: <ShieldCheck className="w-4 h-4" />,
        category: "COMPLIANCE & AUDIT",
      },
      {
        label: "NDPA Compliance",
        href: "/proprietor/dashboard?tab=compliance",
        tabKey: "compliance",
        icon: <UserX className="w-4 h-4" />,
        category: "COMPLIANCE & AUDIT",
      },
      {
        label: "Profile & Settings",
        href: "/proprietor/dashboard?tab=profile",
        tabKey: "profile",
        icon: <Settings className="w-4 h-4" />,
        category: "PREFERENCES",
      },
    ],
    BURSAR: [
      {
        label: "Dashboard",
        href: "/bursar/dashboard",
        tabKey: "overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: "MANAGE",
      },
      {
        label: "Student Roster",
        href: "/bursar/dashboard?tab=students",
        tabKey: "students",
        icon: <GraduationCap className="w-4 h-4" />,
        category: "MANAGE",
      },
      {
        label: "Debtor List",
        href: "/bursar/dashboard?tab=debtors",
        tabKey: "debtors",
        icon: <Users className="w-4 h-4" />,
        category: "MANAGE",
      },
      {
        label: "Fee Structures",
        href: "/bursar/dashboard?tab=fees",
        tabKey: "fees",
        icon: <FileText className="w-4 h-4" />,
        category: "FINANCE & BILLING",
      },
      {
        label: "Fee Posting",
        href: "/bursar/dashboard?tab=posting",
        tabKey: "posting",
        icon: <Receipt className="w-4 h-4" />,
        category: "FINANCE & BILLING",
      },
      {
        label: "Cash & Manual Credits",
        href: "/bursar/dashboard?tab=cash",
        tabKey: "cash",
        icon: <Receipt className="w-4 h-4" />,
        category: "FINANCE & BILLING",
      },
      {
        label: "Installment Plans",
        href: "/bursar/dashboard?tab=installments",
        tabKey: "installments",
        icon: <Calendar className="w-4 h-4" />,
        category: "FINANCE & BILLING",
      },
      {
        label: "Debt Collection",
        href: "/bursar/dashboard?tab=debt-collection",
        tabKey: "debt-collection",
        icon: <MessageSquare className="w-4 h-4" />,
        category: "AUTOMATION & REPORTS",
      },
      {
        label: "Income Reports",
        href: "/bursar/dashboard?tab=reports",
        tabKey: "reports",
        icon: <FileSpreadsheet className="w-4 h-4" />,
        category: "AUTOMATION & REPORTS",
      },
    ],
    ACCOUNTANT: [
      {
        label: "Dashboard",
        href: "/accountant/dashboard",
        tabKey: "overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: "MANAGE",
      },
      {
        label: "Student Ledgers",
        href: "/accountant/dashboard?tab=students",
        tabKey: "students",
        icon: <GraduationCap className="w-4 h-4" />,
        category: "MANAGE",
      },
      {
        label: "Tax & Financial Reports",
        href: "/accountant/dashboard?tab=reports",
        tabKey: "reports",
        icon: <FileSpreadsheet className="w-4 h-4" />,
        category: "FINANCIAL REPORTS",
      },
    ],
    PARENT: [
      {
        label: "Family Dashboard",
        href: "/parent/dashboard",
        tabKey: "overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: "FAMILY PORTAL",
      },
    ],
  };

  const navItems = role ? navItemsByRole[role] || [] : [];
  const categories = Array.from(new Set(navItems.map((item) => item.category)));

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const renderSidebarContent = (isMobile = false) => (
    <>
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2B35AF] to-blue-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-[#2B35AF]/30 ring-1 ring-white/20">
            {schoolConfig.name.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-extrabold text-sm tracking-tight text-white truncate max-w-[150px]">
              {schoolConfig.name}
            </h1>
            <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase">
              Finance & Fees
            </span>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Links Grouped by Category */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        {categories.map((cat) => {
          const items = navItems.filter((i) => i.category === cat);
          return (
            <div key={cat} className="space-y-1">
              <span className="block px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {cat}
              </span>
              <div className="space-y-0.5 pt-1">
                {items.map((item) => {
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
                      className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#2B35AF] text-white font-semibold shadow-md shadow-[#2B35AF]/30 ring-1 ring-white/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                      }`}
                    >
                      <span
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-blue-400 transition-colors"
                        }
                      >
                        {item.icon}
                      </span>
                      <span className="group-hover:translate-x-0.5 transition-transform">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Profile Card (Benkei Style) */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {session?.user && (
          <div
            onClick={() => {
              if (role === "PROPRIETOR" && onTabChange) {
                onTabChange("profile");
                if (isMobile) setIsMobileMenuOpen(false);
              }
            }}
            className={`p-2.5 rounded-xl bg-[#1A1D27] border border-slate-800/80 flex items-center justify-between transition-colors ${
              role === "PROPRIETOR" ? "cursor-pointer hover:bg-slate-800" : ""
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#2B35AF]/25 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {initials || "U"}
              </div>
              <div className="truncate min-w-0 pr-1">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                  {role?.toLowerCase()}
                </p>
              </div>
            </div>
            <Badge variant="brand" className="text-[9px] px-1.5 py-0.5 font-bold uppercase shrink-0">
              {role}
            </Badge>
          </div>
        )}

        {/* Logout button */}
        <button
          type="button"
          onClick={async () => {
            await signOut({ callbackUrl: "/login", redirect: false });
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Desktop Dark Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-[#111319] text-white flex-col border-r border-[#1E222D] shadow-xl shrink-0">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#111319] text-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top Header Bar */}
        <header className="h-16 min-h-[64px] bg-white border-b border-slate-200/90 px-3.5 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0">
          {/* Left: Mobile Toggle & Role Title */}
          <div className="flex items-center gap-2 sm:gap-3">
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
                {role?.toLowerCase()} portal
              </span>
            </div>
          </div>

          {/* Right: Active Session Status Chip */}
          <div className="flex items-center gap-2.5">
            {activeTerm && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#2B35AF] text-xs font-semibold shadow-2xs">
                <Calendar className="w-3.5 h-3.5" />
                <span>{activeTerm.name}</span>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-3.5 sm:p-6 md:p-8 bg-[#F8FAFC]">{children}</div>
      </main>
    </div>
  );
}
