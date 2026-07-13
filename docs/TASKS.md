# Tasks & Sprints

> **Status — as of 2026-07-13.** The original 4-sprint plan below is fully shipped,
> and the app has since grown well past it (email/PDF/CSV/SMS capture, the "Flow"
> auto-logging engine, Fortune Goals/Budget, Analytics, account & privacy). The
> checklists are kept as the historical record; see **Post-plan work** and
> **Backlog** for the current picture.

## Sprint 1 — DB + Core Transaction Engine ✦ v1 functional milestone
**Goal:** App is live, shows demo data, and a real user can add/view transactions — no login required.
**Status: ✅ Shipped** — `a48df49` (schema `0001_init.sql`).

- [x] Run migration SQL (tables + seed rows)
- [x] Build `/app` page: transaction list (date, note, category, amount) + running balance header
- [x] Build category breakdown panel (rule-based SUM per category, current month)
- [x] Build "Add Transaction" form: type, amount, category dropdown, date, note → server action → insert to DB
- [x] Edit & delete transaction (row actions)
- [x] Empty state copy: "No transactions yet — add your first one"
- [x] Loading skeleton + error toast
- [x] Verify: add a transaction → appears in list → balance updates

**Definition of Done:** `/app` renders seed data; add/edit/delete all persist to Supabase and reflect in UI; no dead buttons.

---

## Sprint 2 — Stripe Checkout & Paid Tier
**Goal:** A visitor can pay and receive Pro access in one flow.
**Status: ✅ Shipped** — `d2af9c2` (`app/api/stripe/*`, `app/upgrade`).

- [x] Create Stripe product "Fortune Cat Pro" + price; store keys in Vercel env
- [x] `/upgrade` page with plan details and "Go Pro" button
- [x] `POST /api/checkout` server action → `stripe.createCheckoutSession` → redirect
- [x] Stripe webhook `checkout.session.completed` → insert `payments` row with `status = active`
- [x] Pro badge visible on `/app` when active payment exists (checked server-side)
- [x] Full transaction history unlocked for Pro (free tier shows last 10)
- [x] Test with Stripe test card `4242 4242 4242 4242`
- [x] Write audit_log row: `payment.confirmed` risk_level=high

**Definition of Done:** Test payment flow completes; DB row created; Pro badge appears; audit log entry written.

---

## Sprint 3 — Lock It Down (Auth + Per-User RLS)
**Goal:** Real users have private data; demo mode preserved for guests.
**Status: ✅ Shipped** — `abc97f3` (`0002_auth_rls.sql`, `middleware.ts`). Password reset added in `a012808`.

- [x] Enable Supabase Auth (email + password)
- [x] Sign-up / login pages (`/login`, `/signup`)
- [x] Replace open RLS policies with `auth.uid() = user_id` on all tables
- [x] On sign-up, migrate any session-scoped demo rows to the new user_id
- [x] Protect `/app` — guests see landing page with demo screenshot; auth users see their data
- [x] Payments scoped to authenticated user; webhook sets `user_id` from Stripe metadata

**Definition of Done:** Two separate accounts see only their own transactions; guest sees landing page; no cross-user data leak. *(Verified by the security suite — see DevSecOps below.)*

---

## Sprint 4 — AI Category Tagging & Insights
**Goal:** Transactions auto-tagged; monthly insight card generated.
**Status: ✅ Shipped** — `58a1321` (`lib/tagger.ts`). Note: tagging is **rule-based/on-device**, not an external LLM call.

- [x] On transaction insert, tag → update `ai_category`, `ai_category_source`, `ai_category_confidence`, `ai_category_review_status`
- [x] Show AI-suggested category badge with confidence %; allow user to accept/reject
- [x] Monthly insight card: top spend category, savings rate, biggest single expense
- [x] Write audit_log for every AI tag applied (`risk_level = low`)

**Definition of Done:** New transaction gets a tag inline; badge shows confidence; user correction persists; insight card renders with real numbers.

---

## Post-plan work — Shipped (beyond the original 4 sprints)

**Capture / "Flow" auto-logging engine** — the core differentiator: your money logs itself.
- [x] Email inbox import — IMAP connect, review-before-import, app-password setup guide (`5d556db`, `bc8a944`)
- [x] Broader detection + category matching; promo/voucher exclusion; whitespace-hardened receipt parsing (`f1aee1e`, `2faf1f5`, `e63a3ec`)
- [x] "Scan older emails" pagination; multipart/mixed HTML fix (`319861f`, `319c490`)
- [x] Flow phase 1 — Pulse home, trusted-sender auto-posting, daily cron scan, FX, undo (`f690fa3`)
- [x] Flow phase 2 — bank-statement CSV backfill with dedup + bulk accept (`c8a7a01`, `0009`)
- [x] Flow phase 2b — import PDF statements/receipts + screenshots (OCR), browser-side text extraction (`a1bfbb9`, `f087843`)
- [x] Flow phase 3 — per-user SMS forwarding webhook (`/api/inbound/sms`) + monthly overview (`0a4bcfa`, `0010`)
- [x] Flow C1–C4 — cat mascot + capture streak, SG merchant brain, recurring radar (Pro), autopilot onboarding + provenance (`1ea3240`, `8e6bcaf`, `b2e4f33`, `a638a52`)

**Product surfaces**
- [x] App-wide navigation — mobile bottom tab bar + desktop drawer (`75015ee`)
- [x] Feature-request board with voting (`f27e276`, `0003`)
- [x] Fortune Goals — savings goals + emergency fund, Pro (`7eef006`, `0011`)
- [x] Fortune Budget — per-category monthly limits (`dd48529`, `0012`)
- [x] Analytics — deep-dive period reports, Pro (`9a71526`)
- [x] Account & Privacy page (`7fc6bb9`)
- [x] Camera receipt capture in Add Transaction (`1719f23`)
- [x] Travel category + THB currency (`efa1495`)

---

## DevSecOps — Security verification
Automated suite (`tests/security.mjs`, `npm run test:security`) covering the CLAUDE.md mandate. **18/18 checks pass (2026-07-13).**
- [x] Data isolation — User B gets 0 rows / 0 writes for User A's transactions, audit logs, SMS token
- [x] SQL injection — payloads treated as literals; parameterized PostgREST; SMS-token injection rejected 401; WAF blocks obvious SQLi upstream (defense-in-depth)
- [x] Brute-force — login throttled after 5 rapid attempts per account/IP (`lib/rateLimit.ts`, audit_logs-backed)
- [x] Data exfiltration — no bulk/cross-user/unauthenticated reads; `/api/payments/status` leaks only `{isPro}`

---

## Backlog / Next up
- [ ] Reconcile RLS `admin_user_overview` view (`0004`) — confirm it's service-role-only, not user-exposed
- [ ] Move brute-force throttle from `audit_logs` to a dedicated `rate_limit_events` table + migration once Supabase CLI/DB access is available (keeps the audit log purely semantic)
- [ ] Add the security suite to CI so it runs on every push
- [ ] Rotate/expire SMS webhook tokens; surface "regenerate token" in Account
- [ ] Optional real-LLM tagging path behind a flag (current tagging is rule-based)

## Gantt (sprint → feature)
```
Sprint 1  |████ DB · transaction CRUD · balance · category breakdown          ✅
Sprint 2  |     ████ Stripe checkout · webhook · Pro badge                     ✅
Sprint 3  |          ████ Auth · RLS lock-down · user isolation               ✅
Sprint 4  |               ████ Rule-based tagging · insight card              ✅
Flow      |                    ████████ email · CSV · PDF · SMS · Pulse       ✅
Fortune   |                            ██████ Goals · Budget · Analytics      ✅
Security  |                                  ████ DevSecOps test suite        ✅
```
