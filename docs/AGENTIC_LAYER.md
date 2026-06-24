# Agentic Layer

## Risk Levels & Actions

### Low — auto-applied (no approval)
- **tag_category**: suggest category from note text; stored with confidence score
- **summarise_month**: generate monthly spend narrative; shown as a card

### Medium — light approval (user confirms)
- **create_budget_target**: agent drafts a monthly cap per category based on spend history → user approves before saving

### High — always requires approval
- **initiate_checkout**: start Stripe session (server-side only, never client-exposed)
- **send_payment_receipt**: trigger email after confirmed payment

### Critical — human only
- **issue_refund**: manual via Stripe dashboard only
- **delete_account**: manual + confirmation email

## Named Tools (approved list)
- `supabase.insert`, `supabase.update`, `supabase.select`
- `stripe.createCheckoutSession` (server action only)
- `openai.chatCompletion` (server action only, no raw exec)
- `email.sendReceipt` (post-payment webhook only)

## Audit Log Fields
`action | entity_type | entity_id | payload (before/after) | risk_level | user_id | created_at`

## v1 vs Later
- **v1:** tag_category (auto), summarise_month (auto)
- **Later:** budget_target drafts, anomaly alerts, savings plan agent
