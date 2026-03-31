# Security Remediation Sign-off (Post-Wave 4)

Date: 2026-03-31  
Scope: Full security hardening — Waves 1-4 plus post-Wave 4 remediation plan.

## Implemented Controls

### Phase 1: Access Control and Tenant Visibility
- [x] `GET /api/v1/orgs` returns only assigned orgs for non-admin users
- [x] Tests in `src/data/data.controller.spec.ts` verify role-aware org listing

### Phase 2: Trusted Client IP for Rate-Limiting
- [x] `getClientIp()` defaults to `req.ip` — ignores `x-forwarded-for` unless `TRUST_PROXY=true`
- [x] Tests in `src/auth/auth.controller.spec.ts` verify spoofing resistance (4 scenarios)

### Phase 3: Token Handling and Refresh Tightening
- [x] Access token stored memory-only (no `sessionStorage`/`localStorage`)
- [x] Refresh token accepted only from HttpOnly cookie (body fallback removed)
- [x] Refresh token rotation on every use (one-time-use)
- [x] Replay detection: reused token revokes entire token family + session
- [x] Logout endpoint (`POST /api/v1/auth/logout`) revokes family and clears cookies
- [x] Access token TTL shortened from 7d to 15m
- [x] Rotated refresh token set in HttpOnly cookie on each refresh
- [x] Migration `1775002000000-AddTokenFamilyToRefreshTokens` adds `token_family` column

### Phase 3.5: Auth Enumeration and Bootstrap Race Hardening
- [x] OTP verification returns single generic error (`Invalid or expired OTP`) for all failure modes
- [x] First-admin race prevented via Redis SETNX lock (`auth:first-admin-lock`)

### Phase 4: Config Safety, CSP, Health, and Docs Exposure
- [x] Startup rejects weak/short JWT_SECRET in non-development environments
- [x] CSP removes `unsafe-eval` in production (kept only for dev HMR)
- [x] `connect-src` tightened to `'self' https:` in production
- [x] Public health endpoint (`GET /api/v1/health`) returns minimal `{ status: 'ok' }` only
- [x] Admin diagnostics moved to `GET /api/v1/admin/health` (admin role required)
- [x] Swagger requires explicit `ENABLE_SWAGGER=true` in all environments
- [x] Redis requires `REDIS_PASSWORD` in production (startup guard)
- [x] Postgres requires non-default `DATABASE_PASSWORD` in production (startup guard)
- [x] Redis/Postgres TLS configurable via `REDIS_TLS` and `DATABASE_SSL` env vars

### Phase 5: Supply-Chain and Secret Guardrails
- [x] GitHub Actions workflow for TruffleHog secret scanning and dependency audit
- [x] `.gitignore` hardened to exclude `.env.*`, `*.pem`, `*.key`, `credentials.json`
- [x] `.env.example` updated with all new env vars and security notes
- [x] Frontend vitest upgraded from v1 to v4 — 0 audit vulnerabilities

## Regression Suite

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/auth/auth.controller.spec.ts` | 7 | PASS |
| `src/auth/auth.service.security.spec.ts` | 2 | PASS |
| `src/auth/guards/org-scoping.guard.spec.ts` | 3 | PASS |
| `src/data/data.controller.spec.ts` | 10 | PASS |
| `src/github/controllers/github-app.controller.spec.ts` | 2 | PASS |
| `src/github/controllers/webhook.controller.spec.ts` | 1 | PASS |
| **Total** | **26** | **ALL PASS** |

## Security Gate Results

```
Backend build:                    PASS
Security regression tests:        26/26 PASS
Backend npm audit --audit-level=high:   0 vulnerabilities
Frontend type-check:              PASS
Frontend build:                   PASS
Frontend npm audit --audit-level=high:  0 vulnerabilities
```

## Runtime Monitoring Checklist

- [ ] Alert on login/OTP rate-limit bursts (`429` spikes) by IP/email key prefix
- [ ] Alert on refresh token replay events (`[SECURITY] Refresh token replay detected`)
- [ ] Alert on invalid webhook signature volume (`webhook_signature_invalid`)
- [ ] Alert on missing webhook secret misconfiguration (`webhook_secret_missing`)
- [ ] Alert on queue stress indicators (failed jobs, oldest pending age)
- [ ] Weekly review of auth and webhook security logs

## Accepted Residual Risks

1. **`unsafe-inline` in CSP script-src**: Required for Next.js inline scripts. Mitigated by `frame-ancestors 'none'` and `object-src 'none'`.
2. **`unsafe-eval` in development only**: Needed for Next.js HMR/Fast Refresh. Not present in production builds.
3. **Node.js engine warning for vitest v4**: `EBADENGINE` warning on Node 23 (requires ^20, ^22, or >=24). Non-blocking.

## Release Decision

All security gate commands pass. All 16 remediation items from the post-Wave 4 plan have been implemented and verified. The system is ready for release pending runtime monitoring configuration in the target environment.
