---
trigger: always_on
---

# coding-standards.md

> **Authority:** These rules apply to every file in the SchoolFin codebase.  
> Breaking any rule marked 🔴 means the task failed, even if the code compiles and the feature works.  
> Rules marked 🟡 are strong guidance. Violations must be documented in the completion checklist with a reason.

---

## Language and Compiler

🔴 **TypeScript everywhere. No JavaScript files in `src/` or `worker/`.**  
`tsconfig.json` must have `strict: true`. No exceptions.

🔴 **No `any` types.**  
If you are wrapping an untyped third-party SDK, add a type assertion immediately at the boundary. The `any` must not leak into any function signature, return type, or variable that other code touches.

🔴 **Node.js LTS only.**  
Never use a runtime feature from a Node.js version that is not on an active LTS release line. Check [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases) if unsure.

🔴 **ESM modules only. No `require()`.**  
All imports use `import … from`. No `require()`, no `module.exports`, no `__dirname` hacks. Use `import.meta.url` with `fileURLToPath` where a directory path is needed.

---

## Module and File Structure

🔴 **One concern per file.**  
A file that contains a tRPC router, a service function, a BullMQ worker handler, and a React component is a violation. Split it. The concern of a file is determined by its folder location, not by its length.

🔴 **Named exports only.**  
Exception: Next.js page components and API route handlers where the framework requires `export default`. Every other module uses named exports so that tree-shaking and import tracing work correctly.

🔴 **No barrel re-exports (`index.ts` that re-exports everything from a folder)** unless the folder is a public API boundary (e.g., `src/server/services/balance/index.ts` exposing only `computeOutstandingBalance`). Barrel files that re-export internal implementation files are forbidden — they hide dependency graphs.

---

## Procedures and Functions

🔴 **No business logic inside tRPC procedures.**  
A tRPC procedure does exactly three things: validates input with a Zod schema, calls a service function, and returns the result. Balance calculations, payment state transitions, audit log writes, notification triggers, and fee posting rules all live in `src/server/services/`. If you find yourself writing an `if` statement inside a procedure that is not about input validation, move it to a service.

🔴 **No inline balance computation.**  
The outstanding balance for any student is computed by calling `computeOutstandingBalance(studentId, termId)` from `src/server/services/balance/`. This function is the single implementation of the formula in PRD Module B1. No other code computes a balance. No copy-pasting the formula inline.

🔴 **No silent `catch` blocks.**  
Every `catch` block must do at least one of: re-throw the error, log to Sentry with `Sentry.captureException(e)`, or return an explicit typed error response. An empty `catch` body or a `catch` that only does `console.log` is a violation.

```typescript
// 🔴 FORBIDDEN
try {
  await doSomething();
} catch (e) {}

// 🔴 FORBIDDEN
try {
  await doSomething();
} catch (e) {
  console.log(e);
}

// ✅ ALLOWED
try {
  await doSomething();
} catch (e) {
  Sentry.captureException(e);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Operation failed" });
}
```

🟡 **Keep functions under 60 lines.**  
If a function exceeds 60 lines, ask whether it contains more than one responsibility. If yes, split it. If the function is a single coherent SQL/Prisma query that is legitimately long, document why at the top of the function and note it in the completion checklist.

---

## Async and Concurrency

🔴 **`async/await` only. No raw `.then()/.catch()` chains.**  
Exception: when the Promise chain is a single expression (e.g., `Promise.all([a(), b()]).then(…)` is acceptable if it stays on one line). Multi-step `.then()` chains are always forbidden.

🔴 **Use `Promise.all` for independent parallel operations.**  
Never `await` two independent database queries sequentially when they can run in parallel.

```typescript
// 🔴 SLOW AND WRONG
const student = await db.student.findUnique(…);
const term = await db.academicTerm.findFirst(…);

// ✅ CORRECT
const [student, term] = await Promise.all([
  db.student.findUnique(…),
  db.academicTerm.findFirst(…),
]);
```

---

## Input Validation

🔴 **Every tRPC procedure input validated with a Zod schema.**  
No procedure accepts `input: unknown` without a `.parse()` or `.safeParse()` call. Zod schemas are defined in the same file as the procedure or imported from `src/lib/schemas/`.

🔴 **Zod schemas are the single source of type truth for procedure inputs.**  
Do not duplicate validation logic in both Zod and manual `if` checks. Let Zod do it.

---

## Environment Variables

🔴 **Environment variables are read once, in `src/lib/config.ts`, and validated at startup.**  
No `process.env.SOME_KEY` appears anywhere else in the codebase. Import the validated config object instead.

🔴 **Fail fast if a required variable is missing.**  
`src/lib/config.ts` calls `process.exit(1)` with a clear error message if any required variable is absent when the server starts. Never let the application start silently with a missing key and fail later during a user action.

```typescript
// src/lib/config.ts pattern
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`FATAL: Required environment variable "${key}" is not set.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  database: { url: requireEnv("DATABASE_URL") },
  redis: { url: requireEnv("REDIS_URL") },
  flutterwave: {
    publicKey: requireEnv("FLUTTERWAVE_PUBLIC_KEY"),
    secretKey: requireEnv("FLUTTERWAVE_SECRET_KEY"),
    secretHash: requireEnv("FLUTTERWAVE_SECRET_HASH"),
  },
  // … all other required vars
} as const;
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files and folders | `kebab-case` | `run-debt-scan.ts` |
| React components | `PascalCase` | `ReceiptCard.tsx` |
| Functions and variables | `camelCase` | `computeOutstandingBalance` |
| Constants | `SCREAMING_SNAKE_CASE` | `SMS_MONTHLY_CAP` |
| Zod schemas | `camelCase` + `Schema` suffix | `manualCreditSchema` |
| Prisma models | match schema exactly | `AuditLog`, `FeePosting` |
| tRPC procedures | match PRD §6.3 exactly | `fees.postToClass` |
| BullMQ job names | match PRD §6.5 exactly | `generate-receipt-pdf` |

---

## Formatting

🟡 Prettier with default settings. No custom Prettier config. Run `prettier --check .` before marking a task done.

🔴 Run `tsc --noEmit` with zero errors before marking a task done.

🔴 Run `eslint` with zero errors before marking a task done. Warnings must be documented in the completion checklist with a reason.

🔴 No unused imports. Configure ESLint `no-unused-vars` and `@typescript-eslint/no-unused-imports` as errors.