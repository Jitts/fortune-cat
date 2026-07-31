# fortune-cat

Fortune Cat is a lightweight personal finance tracker that helps consumers log expenses and income, see where their money goes, and unlock full access via a one-time or recurring payment.

## ⚠️ READ THIS BEFORE WRITING ANY CODE
The plan this app was built from is committed in `/docs`. Open it before changing behaviour —
it carries the intent the code alone can't explain:

- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/INTELLIGENCE_LAYER.md`
- `docs/AGENTIC_LAYER.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `docs/TEST_PLAN.md`

## Build rules (binding)
- **No dead buttons.** Every button and form must persist to the database and the UI must
  reflect it — never ship read-only screens of seeded data.
- **Never put secrets in frontend code.**

## Deploy & data (binding — this stack is already provisioned)
- **Deploy by git, never by CLI.** `git add -A && git commit -m "…" && git push` to `main`;
  Vercel auto-deploys from GitHub. Do NOT run `vercel deploy` / `vercel --prod` with local
  files — it desyncs git, and the next push silently overwrites your live app.
- **Commit + push every change.** Git is the source of truth; uncommitted work is lost on
  the next deploy.
- **The Supabase database is already provisioned** and its keys are in this project's Vercel
  env. Pull them locally: `vercel link` then `vercel env pull .env.local`. Don't invent new ones.
- **Your database is already set up.** The schema from your data model has been applied to
  this project's Supabase database and committed at `supabase/migrations/0001_init.sql`. Build on
  the existing tables — **do not recreate them**. To change the schema, add a NEW migration file
  (`supabase/migrations/0002_*.sql`) and apply it; never edit `0001`.
- **Commit as your GitHub identity, or Vercel will block the deploy.** Vercel verifies that
  every commit's author email belongs to your GitHub account. Your machine's default git email
  often isn't, so the very first local commit gets rejected. Pin this repo's identity once
  (already correct for your account) — before your first commit:
  ```
  git config user.email "36510080+Jitts@users.noreply.github.com"
  git config user.name "Jitts"
  ```

## DevSecOps ##
Always implement security development related to coding, authentication and data. Before completion, you must write and execute automated tests to verify: 
1) Data Isolation (assert User A gets a 403/404 error when requesting User B’s data), 
2) SQL Injection Prevention (inject raw payloads like ' OR '1'='1 into endpoints to assert they fail safely), 
3) Brute-Force Defenses (simulate rapid login attempts to assert rate-limiting triggers), and 
4) Data Exfiltration Prevention (verify no bulk data or unintended fields are leaked).
Report the detailed results only when all verification tests has been completed.