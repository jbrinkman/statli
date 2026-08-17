# Design: Password Reset

## Architecture

```
Forgot Password Flow:
┌──────────────┐     ┌───────────────────────┐     ┌──────────────┐     ┌──────────┐
│ /forgot-     │────▶│ Better Auth            │────▶│ Resend API   │────▶│ User's   │
│ password     │     │ requestPasswordReset   │     │ sends email  │     │ inbox    │
│ (enter email)│     │ generates token        │     │              │     │          │
└──────────────┘     └───────────────────────┘     └──────────────┘     └──────────┘
                                                                              │
┌──────────────┐     ┌───────────────────────┐                               │
│ /reset-      │◀────│ User clicks link      │◀──────────────────────────────┘
│ password     │     │ with token            │
│ (new pass)   │     └───────────────────────┘
└──────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Better Auth resetPassword endpoint    │
│ Validates token, hashes new password  │
└───────────────────────────────────────┘

Change Password Flow (authenticated):
┌──────────────┐     ┌───────────────────────┐
│ /dashboard/  │────▶│ Better Auth            │
│ settings     │     │ changePassword         │
│ (curr + new) │     │ (verifies current)     │
└──────────────┘     └───────────────────────┘
```

## Better Auth Configuration

The `sendResetPassword` hook wires Better Auth to Resend:

```typescript
import { betterAuth } from "better-auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    sendResetPassword: ({ user, url }) => {
      void resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Reset your Statli password",
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p>
               <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
      });
    },
  },
  // ...existing config
});
```

Key: `void` before the send (fire-and-forget) so response time doesn't reveal account existence.

## Pages

### /forgot-password (public)

- Form: email input + submit button
- On submit: `POST /api/auth/request-password-reset` (Better Auth's built-in endpoint)
- Always shows: "If an account exists with that email, you'll receive a reset link."

### /reset-password?token=xxx (public)

- Reads `token` from URL query param
- Form: new password + confirm password
- On submit: `POST /api/auth/reset-password` with `{ token, newPassword }` (Better Auth's built-in endpoint)
- On success: redirect to `/login` with success message
- On error (expired/invalid): show error + "Request a new link" link

### /dashboard/settings (authenticated)

- Password change section: current password + new password + confirm
- On submit: calls Better Auth's `changePassword` API
- On success: show confirmation
- On error: show "Current password is incorrect"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | **Yes** | Resend API key for sending emails |
| `RESEND_FROM_EMAIL` | **Yes** | Sender email (must match Resend verified domain) |

## Files to Remove (from PR #2)

- Rewrite `src/pages/api/auth/reset-password.ts` (currently insecure; replace with Better Auth's built-in handler or remove entirely since Better Auth handles it via the catch-all `[...all].ts` route)
- Rewrite `src/pages/forgot-password.astro` (replace insecure direct-reset form with email-request form)
- Delete `scripts/reset-password.ts` (CLI script no longer needed)

## Files to Add/Modify

- `src/lib/auth.ts`: add `sendResetPassword` hook with Resend
- `src/pages/forgot-password.astro`: email request form (safe)
- `src/pages/reset-password.astro`: token-based new password form
- `src/pages/dashboard/settings.astro`: authenticated password change
- `.env.example`: add `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- `package.json`: add `resend` dependency

## Security Properties

- No endpoint accepts a new password without either a valid reset token OR a verified current password
- Reset tokens are generated and validated by Better Auth (time-limited, single-use)
- Email is the verification channel (proves identity ownership)
- Response timing doesn't reveal account existence (fire-and-forget email send)
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are required; app fails to start without them
