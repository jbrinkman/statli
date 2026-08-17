# Requirements: Password Reset

## Context

Statli uses Better Auth for authentication. Password reset uses the standard email-based flow: user requests a reset, receives an email with a secure link, clicks the link, and sets a new password. Resend is the email delivery provider (3,000 emails/month free tier).

## Requirements

### 1. Forgot Password (Email-Based Reset)

**User Story:** As a user who forgot their password, I want to request a password reset email, so that I can securely regain access to my account.

**Acceptance Criteria:**
- THE LOGIN PAGE SHALL have a "Forgot password?" link to a request form
- THE REQUEST FORM SHALL accept an email address and call Better Auth's `requestPasswordReset` endpoint
- THE SYSTEM SHALL send a password reset email via Resend containing a secure, time-limited link
- THE SYSTEM SHALL NOT reveal whether an account exists for the provided email (always show "If an account exists, you'll receive an email")
- THE RESET LINK SHALL direct to a `/reset-password` page with a token in the URL
- THE `/reset-password` PAGE SHALL accept a new password + confirmation
- THE TOKEN SHALL be validated by Better Auth's built-in `resetPassword` endpoint
- EXPIRED OR INVALID TOKENS SHALL show a clear error with instructions to request a new link

### 2. Password Change (Authenticated)

**User Story:** As a logged-in user, I want to change my password from the dashboard, so that I can update my credentials without needing a reset email.

**Acceptance Criteria:**
- THE DASHBOARD SHALL have a settings/account page with a password change form
- THE FORM SHALL require the current password and new password + confirmation
- THE SYSTEM SHALL verify the current password before accepting the change
- THE SYSTEM SHALL reject the change if the current password is incorrect
- THE NEW PASSWORD SHALL be at least 8 characters

### 3. Email Configuration

**Acceptance Criteria:**
- THE SYSTEM SHALL use Resend as the email transport
- THE SYSTEM SHALL require a `RESEND_API_KEY` environment variable
- THE SYSTEM SHALL require a `RESEND_FROM_EMAIL` environment variable (must match a verified Resend domain)
- IF email is not configured (missing env vars), the application SHALL fail to start with a clear error message
- THE `.env.example` SHALL document the Resend variables

### 4. Remove Insecure Implementation

**Acceptance Criteria:**
- THE SYSTEM SHALL remove the existing unauthenticated `POST /api/auth/reset-password` endpoint that accepts email + password without verification
- THE SYSTEM SHALL replace the `/forgot-password` page with the secure email-request flow
- THE SYSTEM SHALL remove `scripts/reset-password.ts` (no longer needed)
