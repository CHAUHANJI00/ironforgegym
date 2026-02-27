# Codebase Issue Review: Proposed Fix Tasks

## 1) Typo fix task
**Task:** Fix grammar in the top-level project description.

- **Issue found:** `README.md` says: "A website for a Athlete."
- **Why this matters:** This is user-facing copy in the first file people read, and it looks unpolished.
- **Suggested change:** Update to "A website for an athlete." (or a fuller product description).
- **Evidence:** `README.md` line 2.

## 2) Bug fix task
**Task:** Handle deleted/non-existent user in `POST /api/auth/change-password`.

- **Issue found:** The handler reads `rows[0].password_hash` without checking whether any row was returned.
- **Impact:** If a token is valid but the user record has been removed, this throws at runtime and returns a generic 500 instead of a controlled 401/404.
- **Suggested change:** Add a guard:
  - If `rows.length === 0`, return a safe response (e.g., 404 "User not found" or 401).
  - Keep current password verification only when a row exists.
- **Evidence:** `project/athlete-ms/backend/routes/auth.js` in the change-password route where `rows[0].password_hash` is accessed.

## 3) Documentation discrepancy task
**Task:** Resolve mismatch between setup docs and repository contents for environment template.

- **Issue found:** README setup says to run `cp .env.example .env` in backend, and folder structure lists `.env.example`, but the file is not present in `project/athlete-ms/backend/`.
- **Impact:** Fresh setup breaks at a documented step.
- **Suggested change (choose one):**
  1. Add `backend/.env.example` with all required variables, **or**
  2. Update docs to use a different onboarding method.
- **Evidence:** `project/README.md`, `project/athlete-ms/README.md`, and missing file under `project/athlete-ms/backend/`.

## 4) Test improvement task
**Task:** Add backend integration tests for critical auth and athlete flows.

- **Issue found:** There is no automated test suite in the repo.
- **Risk:** Regressions in auth/profile endpoints can ship unnoticed.
- **Suggested first test set:**
  - Signup/login happy path.
  - Change-password with non-existent user returns controlled status (regression test for task #2).
  - `GET /api/athlete/stats/series` validates ordering and numeric parsing behavior.
- **Suggested tooling:** Jest + Supertest (and test DB or mocked pool layer).
- **Evidence:** No `test` directory or test scripts across `project/athlete-ms/`.
