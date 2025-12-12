# Passkeys / WebAuthn Sign-in Plan

Goal: Add biometric/passkey auth (WebAuthn) on top of existing NextAuth sessions. Users can register a passkey (Touch ID/Face ID/Windows Hello) and log in with it.

## Architecture
- Use WebAuthn (FIDO2) via `@simplewebauthn/server` and native browser APIs (`navigator.credentials.create` / `.get`).
- Store credentials in DB: `WebAuthnCredential` table (`id`, `userId`, `credentialId`, `publicKey`, `counter`, `transports`, `name`, `createdAt`, `lastUsedAt`).
- Two flows: register (settings) and login (auth screen).

## API Routes
- `POST /api/webauthn/register/start` -> returns registration options (challenge, RP info, user info).
- `POST /api/webauthn/register/finish` -> verifies attestation, stores credential, returns success.
- `POST /api/webauthn/login/start` -> returns authentication options for a given email/username.
- `POST /api/webauthn/login/finish` -> verifies assertion, bumps counter, and issues session (calls NextAuth signIn or custom session cookie).

## UI
- Settings (Profile/Security): “Add passkey” button -> hits `register/start`, calls `navigator.credentials.create`, posts to `register/finish`, shows success and lists registered passkeys.
- Login page: “Login with passkey” button -> collects identifier (email) or offers resident keys, calls `login/start`, then `navigator.credentials.get`, posts to `login/finish`, and on success redirects to dashboard.
- Error handling: show clear fallbacks if browser/device doesn’t support WebAuthn.

## DB Migration (outline)
```sql
CREATE TABLE "WebAuthnCredential" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL UNIQUE,
  "publicKey" TEXT NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "transports" TEXT,
  "name" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "lastUsedAt" TIMESTAMP
);
CREATE INDEX "WebAuthnCredential_userId_idx" ON "WebAuthnCredential"("userId");
```

## Security/Config
- Requires HTTPS and stable RP ID (e.g., `erp.metrica.hr`).
- Add env vars: `WEBAUTHN_RP_ID=erp.metrica.hr`, `WEBAUTHN_RP_NAME=FiskAI`.
- Verify origin on server; implement challenge storage (in session or short-lived cache keyed by user + flow).
- Optionally require signed requests (CSRF) on register/login finish endpoints.

## Steps to Implement
1) Add migration/table and a small Prisma model for WebAuthn credentials.
2) Add helper lib wrapping `@simplewebauthn/server` to generate/verify options.
3) Add four API routes (`register/start`, `register/finish`, `login/start`, `login/finish`).
4) Settings UI: “Add passkey” button + list of registered passkeys (delete/revoke optional).
5) Login UI: “Login with passkey” entry point; if email is known, use non-resident keys; otherwise allow resident keys when supported.
6) Session handoff: on successful assertion, call NextAuth `signIn` with user ID or set session cookie manually consistent with current auth.
7) QA: test on macOS (Touch ID), Windows Hello, Chrome/Edge/Safari; test resident vs non-resident, multiple credentials per user.

## Notes
- No changes applied yet; this is a blueprint. Implementation should avoid breaking existing email/password login; passkeys are additive.
