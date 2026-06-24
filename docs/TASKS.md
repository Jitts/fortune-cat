# Tasks & Sprints

## Sprint 1 — DB + Core Transaction Engine ✦ v1 functional milestone
**Goal:** App is live, shows demo data, and a real user can add/view transactions — no login required.

- [ ] Run migration SQL (tables + seed rows)
- [ ] Build `/app` page: transaction list (date, note, category, amount) + running balance header
- [ ] Build category breakdown panel (rule-based SUM per category, current month)
- [ ] Build "Add Transaction" form: type, amount, category dropdown, date, note → server action → insert to DB
- [ ] Edit & delete transaction (row actions)
- [ ] Empty state copy: "No transactions yet — add your first one"
- [ ] Loading skeleton + error toast
- [ ] Verify: add a transaction → appears in list → balance updates

**Definition of Done:** `/app` renders seed data without login; add/edit/delete all persist to Supabase and reflect in UI; no dead buttons.

---

## Sprint 2 — Stripe Checkout & Paid Tier
**Goal:** A visitor can pay and receive Pro access in one flow.

- [ ] Create Stripe product "Fortune Cat Pro" + price; store keys in Vercel env
- [ ] `/upgrade` page with plan details and "Go Pro" button
- [ ] `POST /api/checkout` server action → `stripe.createCheckoutSession` → redirect
- [ ] Stripe webhook `checkout.session.completed` → insert `payments` row with `status = active`
- [ ] Pro badge visible on `/app` when active payment exists (checked server-side)
- [ ] Full transaction history unlocked for Pro (free tier shows last 10)
- [ ] Test with Stripe test card `4242 4242 4242 4242`
- [ ] Write audit_log row: `payment.confirmed` risk_level=high

**Definition of Done:** Test payment flow completes; DB row created; Pro badge appears; audit log entry written.

---

## Sprint 3 — Lock It Down (Auth + Per-User RLS)
**Goal:** Real users have private data; demo mode preserved for guests.

- [ ] Enable Supabase Auth (email + password)
- [ ] Sign-up / login pages (`/login`, `/signup`)
- [ ] Replace open RLS policies with `auth.uid() = user_id` on all tables
- [ ] On sign-up, migrate any session-scoped demo rows to the new user_id
- [ ] Protect `/app` — guests see landing page with demo screenshot; auth users see their data
- [ ] Payments scoped to authenticated user; webhook sets `user_id` from Stripe metadata

**Definition of Done:** Two separate accounts see only their own transactions; guest sees landing page; no cross-user data leak.

---

## Sprint 4 — AI Category Tagging & Insights
**Goal:** Transactions auto-tagged; monthly insight card generated.

- [ ] On transaction insert, call `POST /api/ai/tag` (server action → OpenAI) → update `ai_category`, `ai_category_source`, `ai_category_confidence`, `ai_category_review_status`
- [ ] Show AI-suggested category badge with confidence %; allow user to accept/reject
- [ ] Monthly insight card: top spend category, savings rate, biggest single expense
- [ ] Write audit_log for every AI tag applied (`risk_level = low`)

**Definition of Done:** New transaction gets AI tag within 3s; badge shows confidence; user correction persists; insight card renders with real numbers.

---

## Gantt (sprint → feature)
```
Sprint 1  |████ DB · transaction CRUD · balance · category breakdown
Sprint 2  |     ████ Stripe checkout · webhook · Pro badge
Sprint 3  |          ████ Auth · RLS lock-down · user isolation
Sprint 4  |               ████ AI tagging · insight card
```
