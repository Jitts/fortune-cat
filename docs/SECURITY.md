# Security

## Secret Handling
- `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Vercel env vars only, never imported in client components
- Stripe Checkout session created server-side; client receives only the session URL
- Webhook signature verified with `STRIPE_WEBHOOK_SECRET` before any DB write

## Permission Model
- **v1 (demo):** open RLS policies — all rows readable and writable without auth
- **Sprint 3 (lock-down):** `user_id = auth.uid()` policies replace open policies; service-role key used only in server actions and webhooks
- Agents inherit the calling user's Supabase session — no elevated permissions

## Approved-Tools Rule
Server actions may only call named, imported SDK methods (`stripe.*`, `supabase.*`, `openai.chatCompletion`). No `eval`, no dynamic `fetch` to arbitrary URLs, no shell exec.

## Audit Principle
Every state-changing action (transaction created/edited/deleted, payment initiated/confirmed, AI tag applied) writes a row to `audit_logs` with `risk_level`, `entity_id`, and a `payload` snapshot. Logs are append-only; no update or delete policy on `audit_logs`.
