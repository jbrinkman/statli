# Tasks: Password Reset

## Task 1: Remove Insecure Implementation

- [ ] Delete `src/pages/api/auth/reset-password.ts` (unauthenticated password reset endpoint)
- [ ] Delete `src/pages/forgot-password.astro` (unauthenticated reset form)
- [ ] Delete `scripts/reset-password.ts` (CLI reset script)
- [ ] Remove "Forgot password?" link from `src/pages/login.astro` (will be re-added properly in Task 4)
- [ ] Verify: `npm run build` succeeds
- [ ] Verify: `npm run test` passes (update/remove any tests referencing deleted files)
- [ ] Commit: `fix(auth): remove insecure unauthenticated password reset`

## Task 2: Add Resend Dependency and Configure Auth

- [ ] Install: `npm install resend`
- [ ] Add to `.env.example`:
  ```bash
  RESEND_API_KEY=re_your_api_key_here
  RESEND_FROM_EMAIL=noreply@yourdomain.com
  ```
- [ ] Add to `.env` (local dev values)
- [ ] Update `src/lib/startup.ts`: validate `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are present on startup (throw if missing)
- [ ] Update `src/lib/auth.ts`: add `sendResetPassword` hook that sends email via Resend:
  ```typescript
  import { Resend } from "resend";
  const resend = new Resend(process.env.RESEND_API_KEY);
  // In betterAuth config:
  emailAndPassword: {
    enabled: true,
    sendResetPassword: ({ user, url }) => {
      void resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: user.email,
        subject: "Reset your Statli password",
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`,
      });
    },
  }
  ```
- [ ] Verify: `npm run build` succeeds
- [ ] Verify: `npm run lint` clean
- [ ] Commit: `feat(auth): integrate Resend for password reset emails`

## Task 3: Create Forgot Password Page

- [ ] Create `src/pages/forgot-password.astro`:
  - Uses AuthLayout
  - Form with single email input + submit button
  - On submit: `POST /api/auth/request-password-reset` with `{ email, redirectTo: "/reset-password" }`
  - On response (success or failure): always show "If an account exists with that email, you'll receive a reset link shortly."
  - Link back to `/login`
- [ ] Verify: `npm run build` succeeds
- [ ] Verify: page renders correctly in dev server
- [ ] Commit: `feat(auth): add forgot password email request page`

## Task 4: Create Reset Password Page

- [ ] Create `src/pages/reset-password.astro`:
  - Uses AuthLayout
  - Reads `token` from URL query string
  - If no token: show error "Invalid reset link. Request a new one from the login page."
  - If token present: show form with new password + confirm password
  - On submit: `POST /api/auth/reset-password` with `{ token, newPassword }`
  - On success: show "Password reset successfully!" with link to `/login`
  - On error: show specific error message (expired, invalid, etc.)
- [ ] Add "Forgot password?" link back to `src/pages/login.astro` pointing to `/forgot-password`
- [ ] Verify: `npm run build` succeeds
- [ ] Commit: `feat(auth): add token-based password reset page`

## Task 5: Add Authenticated Password Change

- [ ] Create `src/pages/dashboard/settings.astro`:
  - Requires authentication (redirect to `/login` if not logged in)
  - Uses Layout with Header
  - Contains password change form: current password + new password + confirm
  - On submit: `POST /api/auth/change-password` with `{ currentPassword, newPassword }`
  - On success: show confirmation message
  - On error (wrong current password): show "Current password is incorrect"
  - On error (validation): show specific message
- [ ] Add "Settings" link to the dashboard Header component
- [ ] Verify: `npm run build` succeeds
- [ ] Commit: `feat(auth): add authenticated password change page`

## Task 6: Write Tests

- [ ] Create `tests/integration/password-reset.test.ts` (replace existing):
  - Test: `sendResetPassword` hook is configured (auth instance has the hook)
  - Test: Better Auth's `forgetPassword` endpoint accepts a request without error
  - Test: Better Auth's `resetPassword` endpoint rejects invalid tokens
  - Test: Better Auth's `changePassword` endpoint requires authentication
  - Test: Better Auth's `changePassword` rejects wrong current password
  - Test: Better Auth's `changePassword` succeeds with correct current password
- [ ] Update `tests/unit/startup.test.ts`: add tests for `RESEND_API_KEY` and `RESEND_FROM_EMAIL` validation
- [ ] Verify: `npm run test` all pass
- [ ] Verify: `npm run test:coverage` meets 80% threshold
- [ ] Commit: `test(auth): add tests for password reset and change flows`

## Task 7: Update Documentation

- [ ] Update `README.md`:
  - Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to Environment Variables table
  - Note in Authentication section that password reset uses email via Resend
- [ ] Update `.kiro/steering/project-conventions.md` if needed
- [ ] Verify: `npm run lint` clean
- [ ] Verify: `npm run build` succeeds
- [ ] Verify: `npm run test` passes
- [ ] Commit: `docs: document Resend email configuration for password reset`
