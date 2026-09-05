---
trigger: glob
globs:
  - "src/app/(auth)/**"
  - "src/lib/auth.ts"
  - "src/server/trpc/router/auth.ts"
  - "src/server/trpc/middleware/**"
---

# authentication.md

> 🔴 Every rule here is a hard requirement from PRD §6.1 and Module A.

---

## Provider and Hashing

🔴 **NextAuth.js with the Credentials provider handles all authentication.**  
No OAuth providers (Google, GitHub, etc.) unless explicitly instructed. No magic links as the primary login method.

🔴 **Passwords are hashed with bcrypt at a minimum of 12 salt rounds.**
```typescript
const hashedPassword = await bcrypt.hash(plainPassword, 12);
```
Never store plaintext passwords. Never use MD5, SHA-1, or SHA-256 for password hashing.

---

## Session Configuration

🔴 **Sessions use HTTP-only, Secure, SameSite=Strict cookies.**  
Configure this in the NextAuth.js options:
```typescript
cookies: {
  sessionToken: {
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  },
},
```

🔴 **Sessions are rolling (token rotated on every request).**  
```typescript
session: { strategy: "jwt", updateAge: 0 }  // rotate on every request
```

🔴 **Idle timeout: 30 minutes. Absolute maximum: 8 hours.**
```typescript
session: {
  maxAge: 8 * 60 * 60,      // 8 hours absolute
  updateAge: 30 * 60,        // refresh window — session expires 30 min after last activity
}
```

🔴 **Redis is the session store via `@auth/redis-adapter`.**  
Never use the default NextAuth.js JWT-in-cookie strategy without Redis. The Redis store allows server-side session invalidation.

🔴 **All session creation and destruction events are written to AuditLog.**

---

## No Self-Registration

🔴 **Parents do not self-register.**  
There is no `/register`, `/signup`, or `/create-account` page or API endpoint for parents. The bursar creates all parent accounts. _(PRD §A4, §13-Q6)_

🔴 **Staff (bursar, accountant, proprietor) do not self-register.**  
The proprietor or builder creates all staff accounts. _(PRD §Assumption 23)_

---

## Login Behaviour

🔴 **Failed login returns exactly:** `"Invalid email or password"`  
No message that indicates which field was wrong. No "user not found" vs "wrong password" distinction.

🔴 **All login events (success and failure) are recorded in AuditLog** with: IP address, timestamp, and user ID (if the email resolved to a valid account).

🔴 **Rate limit: 5 failed attempts per IP per 60 seconds → block for 15 minutes → return HTTP 429.**  
Implemented via `@upstash/ratelimit`. The block applies to the IP, not the account, to prevent account enumeration.

---

## Password Reset

🔴 **Reset links expire after 30 minutes and are single-use.**  
A second click on a used link returns an error. Never silently succeed on a reused link.

🔴 **Requesting a reset for an unregistered email returns the same success message as a valid email.**  
Never indicate whether the email exists in the system. _(PRD §A2-AC2)_

🔴 **Rate limit: 3 reset requests per email address per hour.**

🔴 **Password reset is logged in AuditLog.**

---

## Invite Flow (Parent Accounts)

🔴 **Invite links expire after 48 hours and are single-use.**  
Generating a new invite invalidates the previous one by deleting or overwriting the stored token.

🔴 **A parent cannot log in before accepting the invite and setting their password.**  
`User.isActive` alone is not sufficient. The system must track invite acceptance separately and block login until the invite is used.

🔴 **Re-sending an invite generates a new link and invalidates the old one atomically.**  
Both operations happen in a single database transaction.

🔴 **The invite email is sent within 60 seconds of account creation.** _(PRD §A4-AC1)_

---

## CSRF Protection

🔴 **NextAuth.js built-in CSRF token protection is enabled.**  
Never pass `csrf: false` or equivalent to NextAuth.js configuration.

---

## What Happens at Session Expiry

🔴 **An expired session redirects the user to the login page.**  
The redirect must not expose any data from the session or the page the user was on. A generic `?reason=session_expired` query param on the login URL is acceptable for UX purposes.