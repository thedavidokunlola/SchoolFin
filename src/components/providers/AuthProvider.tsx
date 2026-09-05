"use client";

// src/components/providers/AuthProvider.tsx
// SessionProvider wrapper for client components

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
