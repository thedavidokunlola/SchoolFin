// src/lib/auth.ts
// NextAuth.js configuration
// Locked per authentication.md and PRD §6.1

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { config } from "@/lib/config";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS, type UserRole } from "@/lib/constants";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours absolute
    updateAge: 30 * 60, // 30 minutes idle timeout
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name:
        config.isProduction
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: "strict",
        path: "/",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) {
          return null;
        }

        // If parent has not set password (invite pending), hashedPassword might be empty or invalid
        if (!user.hashedPassword) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword,
        );

        if (!isValidPassword) {
          return null;
        }

        await writeAuditLog({
          userId: user.id,
          action: AUDIT_ACTIONS.USER_LOGIN,
          entity: "User",
          entityId: user.id,
          metadata: { email: user.email, role: user.role },
          isSensitive: false,
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as UserRole,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
        token.isActive = (user as { isActive: boolean }).isActive;
        token.firstName = (user as { firstName: string }).firstName;
        token.lastName = (user as { lastName: string }).lastName;
      }

      if (trigger === "update") {
        if (session?.user?.firstName) token.firstName = session.user.firstName;
        if (session?.user?.lastName) token.lastName = session.user.lastName;
        if (session?.firstName) token.firstName = session.firstName;
        if (session?.lastName) token.lastName = session.lastName;

        if (token.id) {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { firstName: true, lastName: true, role: true, isActive: true },
          });
          if (freshUser) {
            token.firstName = freshUser.firstName;
            token.lastName = freshUser.lastName;
            token.role = freshUser.role as UserRole;
            token.isActive = freshUser.isActive;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.isActive = token.isActive as boolean;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/login`;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id) {
        await writeAuditLog({
          userId: token.id as string,
          action: AUDIT_ACTIONS.USER_LOGOUT,
          entity: "User",
          entityId: token.id as string,
          metadata: { email: token.email },
          isSensitive: false,
        });
      }
    },
  },
  secret: config.auth.secret,
};
