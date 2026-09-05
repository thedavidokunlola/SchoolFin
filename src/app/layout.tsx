import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { TRPCProvider } from "@/lib/trpc/Provider";
import { schoolConfig } from "../../school.config";

export const metadata: Metadata = {
  title: `${schoolConfig.name} — SchoolFin Portal`,
  description: "School fee management and finance portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50/50 text-slate-900 selection:bg-emerald-600 selection:text-white">
        <AuthProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
