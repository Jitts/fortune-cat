# Architecture

## Stack
- **Frontend:** Next.js 14 (App Router) on Vercel
- **Database:** Supabase Postgres (RLS)
- **Auth:** Supabase Auth (Sprint 3 only)
- **Payments:** Stripe Checkout + Webhooks
- **AI:** OpenAI via server-side API route (Sprint 4)

## Now vs Later
| Now | Later |
|---|---|
| Transaction CRUD | Budget targets |
| Category breakdown | Recurring detection |
| Stripe checkout | Savings goals |
| Demo rows, no login | User accounts + isolation |

## Key User Action Flow — "Log an expense"
1. User fills add-expense form (amount, category, date, note)
2. Form POSTs to `/api/transactions` (Next.js server action)
3. Server validates and inserts row into `transactions` table
4. Supabase returns new row; UI optimistically updates list
5. Running balance recalculates client-side from fetched rows
6. *(Sprint 4)* Background job calls OpenAI to suggest category; stores `ai_category + confidence`; UI shows badge

## Layer Plan
1. **Data first** — tables, seed rows, open RLS policies
2. **App logic** — CRUD server actions, balance calculation, Stripe webhook
3. **Smart features** — AI category tagging, monthly insight summary

## Core Without AI
All CRUD, balance, and Stripe flows run on pure Postgres + rule-based aggregations. AI is additive.
