# Test Plan

## Core Success Scenario (manual)
1. Open `/app` — seed transactions visible, balance correct, no login prompt
2. Click **Add Transaction** → fill: Expense, $42.00, Food & Drink, today, "Lunch"
3. Submit → new row appears at top of list; balance decreases by $42.00
4. Click edit on the new row → change amount to $38.00 → save → balance reflects change
5. Delete the row → it disappears; balance returns to pre-add value
6. Navigate to `/upgrade` → click **Go Pro** → Stripe Checkout opens
7. Enter test card `4242 4242 4242 4242`, any future date, any CVC → complete
8. Redirected back to `/app` → Pro badge visible
9. Check Supabase `payments` table → row with `status = active`
10. Check `audit_logs` → row with `action = payment.confirmed`

## Empty State
- Delete all transactions → list shows "No transactions yet — add your first one" message
- Balance shows $0.00
- Category breakdown panel shows empty state copy

## Error Cases
- Submit add-transaction form with no amount → inline validation error, no DB call
- Stripe webhook fires with wrong signature → 400 returned, no DB write
- OpenAI unavailable (Sprint 4) → transaction saves without AI tag; status remains 'unreviewed'; no crash
- Network offline mid-form → error toast "Could not save — please try again"

## Permission Check (Sprint 3+)
- Log in as User A → add transaction → log out → log in as User B → User A's transaction not visible
