// src/server/trpc/trpc.ts
// tRPC initialization, context creation, and procedure builders

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import type { SessionUser } from "@/types";

export interface CreateContextOptions {
  session: { user: SessionUser } | null;
  req?: Request;
}

export async function createTRPCContext(opts?: { req?: Request }) {
  const session = await getServerSession(authOptions);
  return {
    session: session as { user: SessionUser } | null,
    prisma,
    req: opts?.req,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || !ctx.session.user.isActive) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action.",
    });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
