"use client";

// src/lib/trpc/Provider.tsx
// React Query and tRPC Provider wrapper

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./client";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return "http://localhost:3000";
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute stale-while-revalidate for instant in-memory rendering
            cacheTime: 10 * 60 * 1000, // Keep inactive cache alive for 10 minutes (TanStack Query v4)
            refetchOnWindowFocus: false, // Save bandwidth and avoid repetitive requests
            refetchOnReconnect: true, // Automatically synchronize when internet reconnects
            retry: (failureCount) => {
              // Retry up to 2 times for transient network dropouts, but not for 4xx errors
              if (failureCount < 2) return true;
              return false;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
          mutations: {
            retry: 1, // Auto retry transient network failure once for mutations
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
