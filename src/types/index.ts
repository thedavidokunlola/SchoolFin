// src/types/index.ts
// Shared TypeScript types across SchoolFin

import type { UserRole, AuditAction } from "@/lib/constants";
import type { DefaultSession } from "next-auth";

export type { UserRole, AuditAction };

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  isSensitive?: boolean;
  createdAt?: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"];
  }

  interface User extends SessionUser {}
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    isActive: boolean;
    firstName: string;
    lastName: string;
  }
}
