# Intelligence Layer

## Messy Input
Users type free-text notes: "Grab coffee w/ Alex", "Uber to airport", "AMZN order". Category is often left blank.

## Auto-Structure Schema
```json
{
  "transaction_id": "uuid",
  "raw_note": "Grab coffee w/ Alex",
  "suggested_category": "Food & Drink",
  "source": "gpt-4o-mini:v1",
  "confidence": 0.91,
  "review_status": "unreviewed"
}
```

## Events to Track
- Transaction created (triggers AI tagging)
- User corrects AI category (review_status → rejected + manual override)
- Monthly summary generated

## Scoring Rules (rule-based v1)
- **Balance** = SUM(income) − SUM(expense) for current month
- **Top category** = category with highest expense total
- **Savings rate** = (income − expense) / income × 100

## What Gets Ranked
- Categories sorted by spend (descending) in breakdown panel
- Transactions sorted by date (descending) in list

## v1 vs Later
| v1 (rule-based) | Later (AI) |
|---|---|
| Category totals, balance | Auto-tag via LLM |
| Top spend category | Anomaly alerts |
| — | Monthly budget suggestion drafted by agent |
