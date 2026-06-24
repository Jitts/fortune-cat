# Fortune Cat — Product Requirements

## Problem
People overspend because they have no fast, frictionless way to see income vs. expenses in one place. Existing apps are bloated. Fortune Cat does one thing: log money in/out, show the balance, charge for full access.

## Target User
Individual consumers who want to track personal spending without a spreadsheet or a $15/mo budgeting suite.

## Core Objects
- **Transaction** — amount, type (expense/income), category, date, note
- **Category** — name, icon (Food, Transport, Shopping, Salary, …)
- **Payment** — Stripe session, status, plan

## MVP Must-Haves
- [ ] Add a transaction (expense or income) with category, amount, date, optional note
- [ ] View running balance and chronological transaction list
- [ ] Category breakdown panel (totals per category, current month)
- [ ] Stripe Checkout — one click to go Pro
- [ ] Webhook confirms payment → marks user as Pro
- [ ] App is viewable without login (demo data visible)

## Non-Goals (v1)
- Budget targets / savings goals
- Recurring-transaction detection
- CSV/PDF export
- Team or shared accounts
- Mobile app

## Success Criteria
A visitor lands on `/app`, sees demo transactions and a real balance, clicks "Add expense" and saves a new row that appears instantly in the list, then clicks "Go Pro", completes Stripe checkout with a test card, and sees a Pro badge — all without creating an account.
