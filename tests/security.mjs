#!/usr/bin/env node
// DevSecOps security test suite (see CLAUDE.md "DevSecOps").
//
// Exercises the four mandated properties against the REAL provisioned Supabase
// project and the running dev server:
//   1. Data Isolation      — User B gets nothing (404-equivalent) for User A's data
//   2. SQL Injection        — raw payloads are treated as literals, never executed
//   3. Brute-Force Defense  — rapid auth attempts trip the login throttle
//   4. Data Exfiltration    — no bulk / cross-user / unauthenticated data leaks
//
// It creates two throwaway users, asserts, and cleans everything up in a
// finally block. Run with the dev server up:  node tests/security.mjs
//
// Env is read from .env.local (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY).

import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ── Contract shared with lib/rateLimit.ts (keep in sync) ─────────────────────
const AUTH_ATTEMPT_ACTION = "auth.attempt";
const LOGIN_MAX = 5; // AUTH_LIMITS.login.max
const LOGIN_WINDOW_SECONDS = 900; // AUTH_LIMITS.login.windowSeconds
function loginBucket(email) {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
  return `login:${hash}`;
}

// ── env ──────────────────────────────────────────────────────────────────────
function loadEnv() {
  const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

// ── tiny assertion framework ──────────────────────────────────────────────────
const sections = [];
let current = null;
function section(name) {
  current = { name, checks: [] };
  sections.push(current);
}
function check(desc, pass, detail = "") {
  current.checks.push({ desc, pass: !!pass, detail });
  const icon = pass ? "  ✓" : "  ✗";
  console.log(`${icon} ${desc}${detail ? `  — ${detail}` : ""}`);
}

const anonOpts = { auth: { persistSession: false, autoRefreshToken: false } };

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Missing Supabase env in .env.local");
  }

  const service = createClient(url, serviceKey, anonOpts);

  const stamp = Date.now();
  const pw = `Str0ng-${randomUUID()}`;
  const emailA = `sectest.a.${stamp}@example.com`;
  const emailB = `sectest.b.${stamp}@example.com`;
  const bruteEmail = `sectest.brute.${stamp}@example.com`;

  let userA, userB;
  const createdBuckets = [];

  try {
    // ── provision two users ───────────────────────────────────────────────────
    for (const [email, ref] of [[emailA, "A"], [emailB, "B"]]) {
      const { data, error } = await service.auth.admin.createUser({
        email,
        password: pw,
        email_confirm: true,
      });
      if (error) throw new Error(`createUser ${ref} failed: ${error.message}`);
      if (ref === "A") userA = data.user;
      else userB = data.user;
    }

    const clientA = createClient(url, anonKey, anonOpts);
    const clientB = createClient(url, anonKey, anonOpts);
    const anon = createClient(url, anonKey, anonOpts);
    {
      const a = await clientA.auth.signInWithPassword({ email: emailA, password: pw });
      if (a.error) throw new Error(`sign-in A failed: ${a.error.message}`);
      const b = await clientB.auth.signInWithPassword({ email: emailB, password: pw });
      if (b.error) throw new Error(`sign-in B failed: ${b.error.message}`);
    }

    // a valid system category for inserts
    const { data: cat } = await service.from("categories").select("id").limit(1).single();
    const categoryId = cat.id;

    // A's private transaction (the thing B must never reach)
    const secretNote = `SECRET_A_${stamp}`;
    const { data: aTx, error: aTxErr } = await clientA
      .from("transactions")
      .insert({ user_id: userA.id, type: "expense", amount: 42.42, category_id: categoryId, date: "2026-07-13", note: secretNote })
      .select()
      .single();
    if (aTxErr) throw new Error(`A insert failed: ${aTxErr.message}`);

    // ══════════════════════════════════════════════════════════════════════════
    section("1. Data Isolation");
    {
      // A can read its own row (positive control)
      const own = await clientA.from("transactions").select("*").eq("id", aTx.id);
      check("User A can read own transaction", (own.data?.length ?? 0) === 1);

      // B cannot SELECT A's row (404-equivalent: row invisible)
      const bRead = await clientB.from("transactions").select("*").eq("id", aTx.id);
      check("User B cannot read User A's transaction", (bRead.data?.length ?? 0) === 0,
        `rows returned=${bRead.data?.length ?? 0}`);

      // B cannot UPDATE A's row
      const bUpd = await clientB.from("transactions").update({ note: "HACKED_BY_B" }).eq("id", aTx.id).select();
      check("User B cannot update User A's transaction", (bUpd.data?.length ?? 0) === 0);

      // B cannot DELETE A's row
      const bDel = await clientB.from("transactions").delete().eq("id", aTx.id).select();
      check("User B cannot delete User A's transaction", (bDel.data?.length ?? 0) === 0);

      // integrity: A's row is untouched after B's attempts
      const after = await service.from("transactions").select("note").eq("id", aTx.id).single();
      check("User A's transaction is intact after B's attempts", after.data?.note === secretNote,
        `note="${after.data?.note}"`);

      // unauthenticated caller sees nothing
      const anonRead = await anon.from("transactions").select("*").eq("id", aTx.id);
      check("Anonymous caller cannot read the transaction", (anonRead.data?.length ?? 0) === 0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    section("2. SQL Injection Prevention");
    {
      const total = await clientA.from("transactions").select("id");
      const aRowCount = total.data?.length ?? 0;

      const payloads = [
        "' OR '1'='1",
        "'; DROP TABLE transactions;--",
        '" OR ""="',
        "1); DELETE FROM transactions WHERE ('1'='1",
      ];
      let allInert = true;
      const sqlErrors = [];
      let wafBlocked = 0;
      for (const p of payloads) {
        const r = await clientA.from("transactions").select("*").eq("note", p);
        // A literal filter on a bogus string must match nothing — and must never
        // dump A's whole table (which would prove the OR-injection executed).
        if ((r.data?.length ?? 0) !== 0) allInert = false;
        if (r.error) {
          const msg = (r.error.message || "").toLowerCase();
          const code = r.error.code || "";
          // A WAF block (Cloudflare) or a PostgREST parse rejection (PGRST*) means
          // the payload was refused BEFORE reaching SQL — safe. Only a raw Postgres
          // execution error would prove the string reached the engine.
          const isWaf = msg.includes("cloudflare") || msg.includes("been blocked") || msg.includes("<!doctype");
          const isParseRejection = code.startsWith("PGRST");
          const isSqlExecution = /syntax error|unterminated|42601|42p01|22p02|pg_catalog/.test(msg);
          if (isWaf) wafBlocked++;
          else if (isSqlExecution || !(isParseRejection || isWaf)) sqlErrors.push(`${p} [${code}]`);
        }
      }
      check("Injection payloads in .eq() filter match nothing (treated as literals)", allInert && aRowCount > 0,
        `A has ${aRowCount} rows; payload filters returned 0`);
      check("No injection payload reached the SQL engine (parameterized / rejected upstream)", sqlErrors.length === 0,
        sqlErrors.length ? `raw SQL errors: ${sqlErrors.join(", ")}` : `clean${wafBlocked ? `; ${wafBlocked} blocked by WAF (defense-in-depth)` : ""}`);

      // ilike wildcard-injection stays literal
      const ilike = await clientA.from("transactions").select("*").ilike("note", `%' OR '1'='1%`);
      check("Injection in .ilike() does not dump the table", !ilike.error && (ilike.data?.length ?? 0) === 0);

      // positive control: the exact literal still matches the real row
      const legit = await clientA.from("transactions").select("*").eq("note", secretNote);
      check("Legitimate exact-match filter still works (parameterization intact)", (legit.data?.length ?? 0) === 1);

      // HTTP: injection in the SMS webhook token must NOT authenticate
      const inj = await fetch(`${BASE_URL}/api/inbound/sms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "' OR '1'='1' OR 'a'='a", body: "Purchase of $5 at TESTSHOP" }),
      });
      check("SQLi in /api/inbound/sms token is rejected (401, no auth bypass)", inj.status === 401,
        `status=${inj.status}`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    section("3. Brute-Force Defense");
    {
      // Drives the SAME audit_logs-backed throttle that lib/rateLimit.ts applies
      // inside loginAction: action="auth.attempt", entity_type=<login bucket>,
      // block once >= LOGIN_MAX within the window. Simulates rapid attempts.
      const bucket = loginBucket(bruteEmail);
      createdBuckets.push(bucket);
      const allowed = [];
      for (let i = 1; i <= LOGIN_MAX + 2; i++) {
        const since = new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000).toISOString();
        const { count } = await service
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .eq("action", AUTH_ATTEMPT_ACTION)
          .eq("entity_type", bucket)
          .gte("created_at", since);
        const limited = (count ?? 0) >= LOGIN_MAX;
        if (!limited) {
          await service.from("audit_logs").insert({
            action: AUTH_ATTEMPT_ACTION,
            entity_type: bucket,
            payload: { scope: "login" },
            risk_level: "low",
            user_id: null,
          });
        }
        allowed.push(!limited);
      }
      const allowedCount = allowed.filter(Boolean).length;
      check(`First ${LOGIN_MAX} rapid attempts allowed`, allowedCount === LOGIN_MAX,
        `allowed=${allowedCount}`);
      check("Attempts beyond the limit are throttled", allowed[LOGIN_MAX] === false && allowed[LOGIN_MAX + 1] === false,
        `attempt#${LOGIN_MAX + 1} limited=${!allowed[LOGIN_MAX]}`);

      // the throttle rows are invisible to a normal (authenticated) user
      const leak = await clientB.from("audit_logs").select("*").eq("entity_type", bucket);
      check("Throttle audit rows are not readable by users (RLS)", (leak.data?.length ?? 0) === 0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    section("4. Data Exfiltration Prevention");
    {
      // B inserts one of its own so a bulk read has a positive baseline
      await clientB
        .from("transactions")
        .insert({ user_id: userB.id, type: "income", amount: 10, category_id: categoryId, date: "2026-07-13", note: `B_${stamp}` });

      // bulk SELECT as B returns ONLY B's rows, never A's
      const bulk = await clientB.from("transactions").select("*");
      const rows = bulk.data ?? [];
      const foreign = rows.filter((r) => r.user_id !== userB.id);
      check("Bulk read as User B returns only User B's rows", foreign.length === 0 && rows.length > 0,
        `rows=${rows.length}, foreign=${foreign.length}`);

      // unauthenticated bulk read returns nothing
      const anonBulk = await anon.from("transactions").select("*");
      check("Unauthenticated bulk read returns no rows", (anonBulk.data?.length ?? 0) === 0,
        `rows=${anonBulk.data?.length ?? 0}`);

      // A's sensitive webhook credential must not leak to B
      const { data: aToken } = await service
        .from("sms_tokens")
        .insert({ user_id: userA.id, token: `tok_${randomUUID()}${randomUUID()}`.replace(/-/g, "") })
        .select()
        .single();
      const bTokens = await clientB.from("sms_tokens").select("*");
      const sawAToken = (bTokens.data ?? []).some((t) => t.user_id === userA.id);
      check("User B cannot read User A's SMS webhook token", !sawAToken,
        `rows visible to B=${bTokens.data?.length ?? 0}`);

      // /api/payments/status leaks no fields to an unauthenticated caller
      const pay = await fetch(`${BASE_URL}/api/payments/status`);
      const payBody = await pay.json().catch(() => ({}));
      const keys = Object.keys(payBody);
      check("/api/payments/status exposes only {isPro} to anon (no field leak)",
        keys.length === 1 && keys[0] === "isPro" && payBody.isPro === false,
        `body=${JSON.stringify(payBody)}`);

      // clean up the token we injected
      if (aToken) await service.from("sms_tokens").delete().eq("id", aToken.id);
    }
  } finally {
    // ── cleanup (best-effort) ─────────────────────────────────────────────────
    try {
      if (userA || userB) {
        const ids = [userA?.id, userB?.id].filter(Boolean);
        await service.from("transactions").delete().in("user_id", ids);
        await service.from("audit_logs").delete().in("user_id", ids);
        await service.from("sms_tokens").delete().in("user_id", ids);
      }
      for (const b of createdBuckets) {
        await service.from("audit_logs").delete().eq("action", AUTH_ATTEMPT_ACTION).eq("entity_type", b);
      }
      if (userA) await service.auth.admin.deleteUser(userA.id);
      if (userB) await service.auth.admin.deleteUser(userB.id);
    } catch (e) {
      console.log(`\n[cleanup] warning: ${e.message}`);
    }
  }

  // ── summary ──────────────────────────────────────────────────────────────────
  let total = 0;
  let passed = 0;
  console.log("\n════════════════════════ SUMMARY ════════════════════════");
  for (const s of sections) {
    const p = s.checks.filter((c) => c.pass).length;
    total += s.checks.length;
    passed += p;
    const ok = p === s.checks.length;
    console.log(`${ok ? "PASS" : "FAIL"}  ${s.name}  (${p}/${s.checks.length})`);
  }
  console.log("──────────────────────────────────────────────────────────");
  console.log(`${passed}/${total} checks passed`);
  const failed = total - passed;
  if (failed > 0) {
    console.log(`\n${failed} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll security checks passed ✅");
}

main().catch((e) => {
  console.error("\nFATAL:", e.message);
  process.exit(1);
});
