# Repository Improvement Plan (Prioritized)

This plan prioritizes **security and correctness first**, then performance and reliability.

## Priority 0 (Do first: security + critical bugs)

1. **Eliminate stored/reflected XSS in frontend rendering**
   - **Risk:** Multiple views interpolate API/user-provided fields directly with `innerHTML` (achievement titles, stat notes, server error messages), which can execute script payloads.
   - **Evidence:** `profile.html` table/overview rendering and alerts; `login.html` and `signup.html` alert rendering.
   - **Actions:**
     - Replace unsafe string interpolation with DOM node creation + `textContent`.
     - Add a small escape utility for unavoidable template rendering.
     - Standardize toast/alert rendering to text-only payloads.
   - **Success criteria:** Script payloads entered into profile fields render as text, not executable HTML.

2. **Remove default admin seed credentials from schema**
   - **Risk:** Database schema currently seeds a known admin account/password in all environments where SQL is run unchanged.
   - **Actions:**
     - Remove seed insert from base schema.
     - Move demo/admin seed to explicit `seed.dev.sql` for local-only usage.
     - Add startup guard that blocks boot in production if unsafe seed env flags are enabled.
   - **Success criteria:** Fresh production schema contains no default users.

3. **Harden authentication and session handling**
   - **Risk:** JWTs are stored in `localStorage` (high impact if XSS occurs). Secret/env safety checks are not enforced at startup.
   - **Actions:**
     - Move auth token to secure, `HttpOnly`, `SameSite=Strict` cookie (or at minimum reduce XSS surface before migration).
     - Add startup validation: fail fast when `JWT_SECRET` is missing/weak.
     - Add login attempt telemetry and account lock/backoff for repeated failures.
   - **Success criteria:** No token in `localStorage`; app refuses startup with weak/missing JWT secret.

4. **Add request validation for update and delete endpoints**
   - **Risk:** `PUT /profile`, `PUT /training`, and delete routes accept broad payloads/params with minimal schema validation.
   - **Actions:**
     - Introduce `express-validator` schemas for each field (types, lengths, enums, numeric ranges, URL format).
     - Validate `:id` parameters as positive integers for delete routes.
   - **Success criteria:** Invalid payloads are rejected with 422; DB never receives malformed values.

## Priority 1 (Next: performance + reliability)

5. **Optimize profile fetch path (reduce DB round-trips)**
   - **Risk:** Profile endpoint executes several sequential queries per request, increasing latency under load.
   - **Actions:**
     - Run independent reads in parallel (`Promise.all`) or consolidate with joins where practical.
     - Add selective field retrieval (avoid `SELECT *`).
   - **Success criteria:** Lower p95 response latency for `/api/athlete/profile`.

6. **Add DB indexes aligned to query patterns**
   - **Risk:** Frequent sorts/filtering on `achievements` and `performance_stats` are not covered by composite indexes.
   - **Actions:**
     - Add `(user_id, award_date)` index on `achievements`.
     - Add `(user_id, recorded_date)` and `(user_id, stat_name, recorded_date)` indexes on `performance_stats`.
   - **Success criteria:** Explain plans avoid filesort/full scan for common profile + analytics queries.

7. **Make signup/profile bootstrap atomic**
   - **Risk:** Signup writes to multiple tables without a transaction; partial writes can leave inconsistent state.
   - **Actions:**
     - Wrap user/profile/training creation in a DB transaction.
     - Add rollback and deterministic error mapping.
   - **Success criteria:** Failure in any write leaves no partial account artifacts.

8. **Add pagination/limits for achievements and stats**
   - **Risk:** Unbounded fetches can bloat payloads and degrade dashboard rendering over time.
   - **Actions:**
     - Add `limit`, `offset`, optional date filters.
     - Keep dashboard previews capped; fetch full history on demand.
   - **Success criteria:** Response size stays bounded; UI remains responsive with large datasets.

## Priority 2 (Operational hardening + maintainability)

9. **Introduce baseline API security middleware**
   - **Actions:**
     - Add `helmet`, stricter CORS origin policy per environment, and optional response compression.
     - Add per-route rate limits beyond auth (e.g., write-heavy athlete routes).

10. **Strengthen observability and error hygiene**
   - **Actions:**
     - Add structured logging with request IDs.
     - Redact sensitive fields from logs.
     - Centralize error codes and client-safe messages.

11. **Testing and CI gate**
   - **Actions:**
     - Add integration tests for auth, profile CRUD, and analytics series.
     - Add regression tests for XSS sanitization and authorization checks.
     - Run lint/test in CI before merge.

12. **Dependency and supply-chain hygiene**
   - **Actions:**
     - Add lockfile policy, automated dependency updates, and routine `npm audit` review.
     - Pin runtime Node version and document supported matrix.

---

## Suggested execution order (2-week sprint example)

- **Days 1–3:** P0.1 + P0.2 (XSS fixes, remove seed admin).
- **Days 4–5:** P0.3 + P0.4 (auth/session hardening, validation schemas).
- **Days 6–8:** P1.5 + P1.6 (query and index optimization).
- **Days 9–10:** P1.7 + P1.8 (transactions + pagination).
- **Parallel track:** P2 testing/CI foundation starts immediately after P0 merges.
