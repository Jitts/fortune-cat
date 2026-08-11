---
target: /app main shell
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-11T02-24-54Z
slug: app-app-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence), run in isolation.

**Evidence caveat:** the repo's dev server was returning HTTP 500 on every route for the whole run (three orphaned `next dev` instances sharing one `.next`; my fault — an earlier `TaskStop` killed a wrapper and orphaned its server child). Both agents independently built disposable mirrors in the scratchpad and ran the **real components** against fixture data. The repo was never modified. So: source claims are exact; live measurements are real but taken against fixtures, not the user's own ledger. A second, related correction — PRODUCT.md says `/app` is demo-first and open to anonymous visitors. It is not: `app/app/page.tsx:17` is `if (!user) redirect("/")`. My brief propagated that stale claim to both agents.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | `Toast` is the only confirmation of the core verb on mobile, yet success and failure render identically (`bg-action`, white text, no icon), never auto-dismiss, and carry no `role="status"`. |
| 2 | Match System / Real World | 3 | Home is titled "The numbers" and shows almost none; `MonthlyOverview.tsx:36` renders "Aug 26", which reads as a day-of-month. |
| 3 | User Control and Freedom | 2 | Delete has no confirm and no undo (`AppShell.tsx:298`), while `AutopilotChecklist.tsx:91` promises "You can undo it whenever you like". Desktop modal has no ✕ and no backdrop dismiss. |
| 4 | Consistency and Standards | 2 | Two primary-button languages for the same job; two minus glyphs (`−` vs `-`) in one list; three modal implementations, only two of which are dialogs. |
| 5 | Error Prevention | 2 | Direction (expense vs income) is inferred silently in the quick sheet and surfaced only when it lands on income; date invisible in add mode; no confirm on delete. |
| 6 | Recognition Rather Than Recall | 3 | Frequency-ordered chips and provenance badges are excellent; but the category→direction rule must be recalled, and "Aug 26" decoded. |
| 7 | Flexibility and Efficiency | 3 | Calculator keypad, `?tab=` deep links, persisted ledger folds. But no keyboard shortcut for the core verb, and Tab from Log walks 18 controls before reaching the open form. |
| 8 | Aesthetic and Minimalist Design | 2 | Home renders 9 competing panels; a free user's most prominent rail card is an upsell; two streak counters on one screen; two "Spending by category" panels showing different numbers. |
| 9 | Error Recovery | 2 | Failure toast is generic, not styled as an error, not announced, non-dismissing, and on mobile sits over the bottom nav. `EntrySheet` has no inline errors — the button is just disabled. |
| 10 | Help and Documentation | 3 | `HelpLink` + `/faq` in both chromes; the checklist is genuinely instructional. But nothing explains the cat's mood rule — the one thing users will demand when it contradicts the ring. |
| **Total** | | **25/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**Specific in its ornaments, category-interchangeable in its working surface.**

The parts that could not be lifted into another product are real: the `LuckRing` minted-koban medallion whose gold arc *is* the savings rate; the `SlipsPanel` paper chits with rule-lines, vermilion top edge and rotated seal; `LanternStreak`; the "In your pouch · till 31 Aug" framing; and above all `EntrySheet` — a calculator keypad with `+`/`−` and category chips **ordered by the user's own usage frequency**, direction inferred per category. That last one is shaped by the real scene (splitting a bill, standing in a queue) rather than by a form library.

Strip the rails, though, and you have the 2024 default app shell: sticky top bar, centred pill tabs, `lg:grid-cols-[270px_minmax(0,1fr)_300px]`, bottom tab bar with a centre FAB, and a Home column of checklist card → chart card → two half-width cards. The brand lives almost entirely in the two rails a mobile user mostly does not see.

The inverse risk — charm overwhelming credibility — has already landed once, concretely (see P0 #2).

**Deterministic scan:** CLI detector exit 2, 4 findings, all one rule (`border-accent-on-rounded`) at `AnalyticsPanel.tsx:127`, `BalanceForecast.tsx:56`, `FortuneGoals.tsx:94`, `SubscriptionKillChain.tsx:54` — all `border-t-2` on the Pro-teaser card. **False positives**: the rule targets a full thick border clashing with a radius; these are a top-edge-only gold rule used identically on all four gated cards, which is deliberate brand consistency. Real caveat underneath it: at `rounded-2xl` the gold bar is clipped by the corner radius and terminates in a taper.

Runtime detector in-page: 22 findings — **Undersized functional text ×17** (all 10px: nav labels, chart axes, the signed money deltas, the PRO pill), **Low contrast text ×3**, border-accent ×1 (same false positive), and one unattributable "Layout property animation" against `body`.

## Overall Impression

The entry experience is genuinely excellent and the visual system is coherent and well-tokenised. The problem is that the Home screen — the first thing a returning user sees — has no object. Nine peer panels compete, the largest type is a label rather than money, the one hero number is paywalled, and the mascot occasionally contradicts the arithmetic beside it. **The single biggest opportunity: decide what the Home screen is for, and let one thing win.**

## What's Working

1. **`EntrySheet` as one surface for add *and* edit, with a calculator and frequency-ordered chips.** It collapses the two most common money tasks into one muscle memory; the calculator matches the actual scene (a receipt with several lines, a split bill); frequency ordering means the leftmost chip is usually right, so the task reduces to *amount + one tap*. The documented refusal to re-derive direction in edit mode (`EntrySheet.tsx:26-31`) prevents a silent income→expense flip — exactly the correctness that earns trust with money.
2. **`AutopilotChecklist` showing exactly one step, consequence-first.** It turns a 4-item setup into a single decision, and step 1 is the cheapest thing in the product. That is "value before the wall" implemented rather than asserted: the app proves it works before asking for an inbox password.
3. **The token system and Shrine mode.** One `.dark` flip re-derives every surface; semantic tokens (`--jade` = money-in, `--vermilion` reserved for attention) mean charm is carried by colour and material rather than extra widgets. The slips deliberately keep warm `--paper` in both themes, so the fortune stays a physical object instead of a themed card.

## Priority Issues

**[P0] The Bills tab is unreachable on mobile.** — verified in source
`ShrineChrome.tsx:221` renders `[TABS[0], TABS[1]]`, the FAB, a hardcoded `"fortunes"`, then `MoreItem`. `TABS[3]` (Bills) is never rendered on mobile, and the More sheet (`:164-214`) contains only Settings, Help & FAQ, Go Pro, Appearance, email and Sign out.
*Why it matters:* recurring radar, subscription kill-chain and bills due — what a money-anxious user most wants before payday — are reachable only by hand-typing `/app?tab=bills`. On the product's primary device.
*Fix:* replace `MoreItem` with Bills; move Settings/Help/Sign-out to the mobile header, which currently holds only a wordmark and a theme toggle. Nav becomes Home · Ledger · ＋ · Bills · Fortunes.
*Command:* `/impeccable adapt`

**[P0] The cat's mood contradicts the numbers it sits on.** — verified in source
`lib/catState.ts:15`: `if (net < 0 || (burnDelta != null && burnDelta > 30)) return "burning"`. With `net > 0` and a savings rate of 91%, `CatRail.tsx:37` prints **"Ears back · luck is thin"** directly above "saving 91% of August's income", with the ring 91% gold.
*Why it matters:* this is a money tool. The moment the mascot and the arithmetic disagree inside 100px, the mascot stops being decoration and becomes misinformation — and "encourage, never scold" is breached by the app's own logic, in the place a worried user looks first.
*Fix:* make the caption a reading of the same quantity the ring shows, and demote pace to a second line: "Well fed · saving 91%" + "…but spending 271% faster than last month". If mood must stay pace-driven, ring and caption need separate labelled homes.
*Command:* `/impeccable clarify`

**[P1] `--ink-faint` fails WCAG AA in both themes and is used ~155 times, including the mobile bottom-nav labels.** — independently measured twice
Light: `rgb(156,147,132)` → **2.79–3.03:1** at 10–11px. Dark: `rgb(99,108,146)` → **3.50–3.74:1**. Threshold is 4.5:1. The same token carries nav labels, the `EntrySheet` running expression (the number you verify before committing money), chart axes, `MonthlyOverview` deltas and provenance stamps. The runtime detector independently flagged 17 undersized-text and 3 low-contrast nodes on the same token. Also failing: the vermilion ledger count badge, white on `rgb(240,121,91)` = **2.77:1**.
*Fix:* darken `--ink-faint` to ≥4.5:1 in both themes (light ≈ `#7a7263`; dark ≈ `#8f97b8`, which is already `--ink-subtle` — the token may simply collapse into it), raise nav labels to 11px non-uppercase, and darken the badge background or use dark ink on it.
*Command:* `/impeccable audit`

**[P1] The desktop Add/Edit modal is not a dialog, and no form field has an accessible name.**
`AppShell.tsx:501` is a bare `<div className="fixed inset-0">` — no `role="dialog"`, no `aria-modal`, no `aria-labelledby`, no focus move, no focus trap, no backdrop dismiss. All 18 background controls stay ahead of the form in tab order. Esc closes it only as a side effect of the `lg:hidden` `EntrySheet` still being mounted and listening. `TransactionForm.tsx:146/184/199/209` use bare `<label>` with no `htmlFor` — the a11y tree reports `textbox "0.00"`, `checkbox "on"`. Note `EntrySheet` and `AmountKeypadSheet` *do* have correct dialog semantics, so the desktop path is the inconsistent one.
*Fix:* dialog role + `aria-modal` + `aria-labelledby`, focus the amount input on open, trap Tab, restore focus to ＋ on close, backdrop dismiss, own Esc handler; associate every label via `htmlFor`/`id`.
*Command:* `/impeccable harden`

**[P1] `CashFlowBars` uses one shared scale, so a single salary flattens the entire month.**
`lib/monthPulse.ts:87`: `maxBar = Math.max(1, ...days.map(d => Math.max(d.in, d.out)))`, with a 6% floor in `CashFlowBars.tsx:51/58`. With one S$4,200 deposit, every spending day (S$2–150) renders at the floor — a flat line with one green spike.
*Why it matters:* it is the largest data object on Home and it conveys nothing about where the money went, which is the product's one-sentence purpose.
*Fix:* scale in and out independently (or scale to the max expense day and let income overflow with a labelled cap), and drop the floor to ~2%.
*Command:* `/impeccable layout`

**[P2] Secondary buttons nearly vanish in Shrine mode, including the monetisation CTA.**
`bg-action` in dark is `#1f2742` on `--surface` `#0a0e1c`: "Go Pro", "+ Set a budget", "Scan now", "Confirm" all read as barely-there slabs, with `text-white` hardcoded instead of `text-on-action`.
*Fix:* give `.btn-ink` a 1px `--line` ring in dark and route these through the button classes instead of ad-hoc utilities.
*Command:* `/impeccable colorize`

## Cognitive Load — 5 of 8 failed (critical)

Failed: **single focus** (Home presents 9 peer panels), **chunking** (left rail runs streak + ring + caption + pouch + budget list), **visual hierarchy** (largest type on Home is the label "The numbers" at 20px; actual money is 12–14px; the one hero number is paywalled), **minimal choices**, **working memory** (cross-tab number reconciliation, sign conventions differing by level).
Passed: grouping, one-thing-at-a-time (`AutopilotChecklist` — the best decision in the build), progressive disclosure.

Decision points over 4 visible options: `AnalyticsPanel` range chips (5) · desktop Add modal (6 inputs + 3 buttons) · `EntrySheet` chips (6 in a scroller showing ~2.5, no scroll affordance) · desktop header (8 items in a 48px row) · mobile More sheet (5–6) · `FortuneBudget` rail (5 at 12px in 270px) · Ledger with 3 months (~14 disclosure toggles before a row).

## Emotional Journey

**Peak:** tapping `1 2 + 8` and watching `$20.00` resolve above the keypad — the one moment the product feels made for you. The brand correctly disappears here.
**End (broken):** the run ends on a toast styled identically whether the money was saved or lost, never announced, never auto-dismissed, sitting on top of the bottom nav. Peak-end says the last thing is disproportionately remembered; right now the last thing is ambiguous. The `.print-in` receipt animation exists in `globals.css:365` but the new row lands off-screen when the sheet closes, so the celebration is spent where nobody sees it.
**Valley 1 — the cold open:** an empty account shows a page titled "The numbers", a ring at zero, six unlit lanterns and "Watchful · luck holds steady" — a mood reading derived from no data.
**Valley 2:** the P0 above, at exactly the high-stakes moment.

## Persona Red Flags

**Casey (distracted mobile user)** — the primary persona, worst served. Bills unreachable from the bottom nav. Nav labels 10px mono uppercase at 3.03:1, one-handed, in daylight. `Toast.tsx:3` `bottom-6` with no safe-area allowance and no auto-dismiss, so the save confirmation covers the nav until she taps a tiny ✕. A mis-tapped chip silently logs salary as spending. Six category chips in a scroller showing ~2.5 with no scroll affordance.

**Sam (accessibility-dependent)** — `TransactionForm` fields have no accessible names; the recurring checkbox announces as "on". Desktop modal has no dialog role and no focus management. `Toast` has no `role="status"` — the only confirmation that money was recorded is never announced. **No `<h1>` anywhere on `/app`**; the first heading is the left rail's budget card. `LuckRing` and `CashFlowBars` are decorative SVG with no text alternative for the values they encode.

**Jordan (confused first-timer)** — empty account, page titled "The numbers", no numbers. `CatRail` reports a mood from zero data. `EntrySheet` has no visible title and no visible expense/income control. Two streak counters on one screen (5-night logging vs 4-day fortune) — which is he protecting?

**Priya, the money-anxious phone-in-a-queue logger (project-specific)** — she just spent S$68 and opens the app to check she is fine. The largest statement she gets is "Ears back · luck is thin" while the ring says she is saving 91%. The one number that answers her question, "In your pouch", is paywalled behind a Go Pro slab. The chart she would scan next is a flat line. If she corrects a mis-typed row, Delete fires with no confirm and no undo — contradicting the trust promise made during setup.

## Minor Observations

- **Hardcoded locales, against the project's own binding convention**: `MonthlyOverview.tsx:36` `"en-SG"`; `TransactionList.tsx:24,37` `"en-US"`; `:132` `toLocaleString("en-SG")`; `PouchSummary.tsx:39-42` `"en-SG"`. `CatRail.tsx:43` gets it right — use that as the pattern.
- `MonthlyOverview.tsx:36` renders "Aug 26" (`year: "2-digit"`) — use "Aug 2026".
- `FortuneBudget.tsx:140-146` `flex justify-between` with no `gap` — at 270px the spans collide: "$259.40 of $650.00 budgeted$390.60 left".
- Two different minus glyphs in one list: `−` (U+2212) in `NetAmount`, `-` (hyphen) in `TransactionRow.tsx:172`.
- Two "Spending by category" panels with the same title and different numbers ($214.50 on Home, $444.50 on Fortunes), no range label on the Home one.
- `TransactionForm.tsx:18-20` `todayIso()` uses UTC, not the profile timezone. Currently overridden by `AppShell.tsx:515`, so impact is nil — latent off-by-one for any future call site.
- "Snap a receipt" renders first in the Add modal for every user, is not gated on `isPro`, and does not appear in `PLAN_COMPARISON` — while PRODUCT.md lists receipt scanning as a Pro unlock. Plan/product drift, and it puts a rarely-used feature above the core verb.
- The Ledger tab badge and the `ReviewQueue` contents come from different props and can disagree (badge said 3 while the queue said "Review is clear").
- Possible hydration mismatch in `LuckRing.tsx:36-39`: raw `Math.cos`/`Math.sin` floats are emitted as SVG coordinates. Transcendental functions are not required to be correctly rounded, so Node and browser V8 can differ in the last digits. Assessment A observed a console hydration error here; Assessment B's run showed a clean console. **Unconfirmed — worth reproducing.** Rounding the coordinates fixes it either way.
- The desktop rails are not sticky; on the Fortunes tab the whole shrine scrolls away, leaving a generic analytics page.

## Questions to Consider

1. **If the cat's mood and the ring can disagree, which one is the product?** Is the mood a *reading* of the numbers — in which case it must never contradict them — or a *second opinion*, in which case it needs its own labelled place?
2. **Home is called "The numbers", and the only big number on it is paywalled.** What is a free user supposed to walk away knowing? If the answer is "not much", the free tier is a trailer rather than a genuinely useful product.
3. **If logging is the whole product, why does the Add form open with a camera button that is not even in the plan table?** What would this screen look like if the keypad were the first thing on desktop too, instead of the fifth?
4. **The mobile nav spends one of five slots on "More" and orphans Bills entirely.** Is Bills a destination, or is it three cards that belong on Home?
5. **Two streaks, one screen.** Which one are you asking someone to protect, and what happens to "encourage, never scold" the first morning they break both?
