Two answers below. Verified against the current tree (clean, `41856e1` at HEAD) rather than from memory.

---

# 1. Items that need *your* decision

Nothing is blocked on me. These five are all "your call", ordered by how much they cost you:

| # | Item | The decision |
|---|---|---|
| 1 | **`design/DESIGN.md` is stale and wrong** | It documents Plus Jakarta Sans and a lavender/blue Material palette (`--surface: #faf8ff`, `primary #705d00`). The shipped system is **Lacquer & Leaf** — Bricolage Grotesque / Hanken Grotesk, gold-on-ink, midnight-blue dark mode. Anyone (or any image generator) fed this file gets the wrong brand. Delete it, or let me regenerate it from `globals.css`? |
| 2 | **`PRO_FEATURES[0]`** | After the resync, the Pro pitch opens on a weaker hook than "The month ahead". Reordering is a marketing judgement, not a bug — say the word and I'll move it. |
| 3 | **Retire `blocked_senders`** | One holdout: `lib/email/processScan.ts:153`. The blocker is that `blocked_senders` feeds the anonymous cross-user aggregate (`lib/email/senderSignals.ts`), so retiring it means moving that feed to `sender_rules` first. Worth doing, needs a migration. |
| 4 | **Commit `1413edf` has a mangled subject** (just `@`) | My PowerShell here-string leaked into the Bash tool. Fixing it means a force-push over a deployed commit. Cosmetic — I'd leave it. |
| 5 | **`docs/TASKS.md` backlog — 2 items still open** | `[ ]` Rotate/expire SMS webhook tokens + "regenerate token" in Account. `[ ]` Optional real-LLM tagging behind a flag — that one hits your **no-paid-APIs** rule, so it's parked by default unless you want a free-tier stepping stone. |

Minor, no decision needed unless you disagree: `LandingDemo.tsx:44` still has a literal `"en-US"`. It's the anonymous landing page with no profile to read from, so it's arguably correct as-is.

---

# 2. Image asset spec

## First, the constraint that shapes the whole list

**The app currently ships zero image files.** `public/` contains only `llms.txt`. Every visual — cat, Daruma, lanterns, coin, luck ring — is inline SVG that reacts to live data: the luck ring animates `stroke-dashoffset` from the savings rate, the Daruma's right pupil grows `r=0 → 5` with goal progress, lanterns swap fills off CSS theme tokens.

So generated images **cannot replace those components**. Split the work:

- **Group A — real files, genuinely missing.** Generate these.
- **Group B — reference art.** Generate to *redesign* the mark, then I hand-trace it back into the SVG component so it keeps its states and animation.

---

## The palette (give this to every generator)

**Cat mark — hardcoded, deliberately theme-independent** (it must read on both cream and midnight):

| Role | Hex |
|---|---|
| Gold leaf, base | `#e8bd54` |
| Gold leaf, highlight (gradient top) | `#f4d888` |
| Lacquer outline (every stroke) | `#6f4e0d` |
| Cream (muzzle, inner ear, resting paw) | `#fbf3dd` |
| Bell collar cord | `#cf9528` |

**Theme tokens — for Daruma, lanterns, coins, backgrounds:**

| Token | Light | Dark |
|---|---|---|
| `--seal` (shrine red) | `#b1301b` | `#b1301b` (same) |
| `--paper` (slip stock) | `#f6ecd3` | `#f6ecd3` (same) |
| `--gold` | `#e8b64a` | `#edc35b` |
| `--leaf-hi` / `--leaf-lo` | `#f6d878` / `#c9902a` | `#f6d878` / `#b9832a` |
| `--on-gold` (ink on gold) | `#2a1e05` | `#2a1e05` |
| `--surface` | `#ffffff` | `#0a0e1c` (midnight blue) |
| `--ink` | `#1e1913` | `#f7f1e6` |
| `--vermilion` (alert) | `#c0361d` | `#f0795b` |
| `--jade` (positive) | `#0e6f52` | `#5ec9a0` |

**Hard rule:** red/vermilion **never** appears on the cat. Attention lives elsewhere in the UI. The cat is gold-and-lacquer only.

---

## GROUP A — files the app actually needs

### A1. `app/icon.svg` — favicon **(worst gap in the app)**

Right now this file is, verbatim:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <text x="16" y="25" font-size="26" text-anchor="middle">🐱</text>
</svg>
```

A **system emoji rendered as text** — it looks different on every OS and has nothing to do with the brand.

- **Format:** SVG, `viewBox="0 0 32 32"`, no `<text>`, no external fonts
- **Also deliver:** PNG at 16, 32, 48 for legacy
- **Subject:** the cat's **head only** — full body is unreadable at 16px. Circular gold head, lacquer outline, two triangular ears with cream inner triangles, closed content eyes, cream muzzle. **Drop** whiskers, bell, koban, body — they turn to mud at 16px.
- **Background:** transparent
- **Test:** must be identifiable at 16×16 in a browser tab beside 12 other tabs

### A2. `app/apple-icon.png` — iOS home screen

- **180×180 PNG, opaque** (iOS masks corners itself; never ship transparency)
- **Background:** midnight blue `#0a0e1c` full bleed
- **Subject:** the A1 head mark, gold, centred, occupying ~62% of the canvas with even margin
- No text, no wordmark, no rounded corners baked in

### A3. PWA icons (`app/manifest.ts` does not exist yet — needs creating too)

- `icon-192.png` — 192×192, opaque, midnight background
- `icon-512.png` — 512×512, same
- `icon-512-maskable.png` — 512×512, **subject inside the centre 409×409 safe circle**, background bled to all four edges

### A4. `app/opengraph-image` — social card

Currently a `next/og` React component: a gold circle with the character 金 and the headline "Your money logs itself." Functional but flat.

- **1200×630 PNG**
- **Background:** radial gradient, `#2a2013` at 78%/12% → `#17130f` at 55%
- **Subject:** the full-body cat, gold leaf, ~380px tall, positioned right-of-centre; a struck koban coin catching light near the raised paw
- **Text zone (left 55%, keep clear of art):** "Your money logs itself." in `#f7f1e6`, then a gold `#edc35b` line "Fortune Cat · no bank login · any currency · $9 once for Pro"
- **Safe area:** keep all text inside a 60px margin — LinkedIn and Slack crop differently
- If you deliver this as a PNG I'll swap the `ImageResponse` component for a static file

### A5. `app/twitter-image` — 1200×630

Doesn't exist; Next silently reuses the OG image. That's fine — **skip unless you want a distinct crop.**

---

## GROUP B — reference art (SVG components, not files)

Generate these to *redesign*; I trace them back into code.

> ⚠️ **`FortuneCat` is under a standing rule:** don't redraw it without an explicit request. A simplified version was shipped, seen live, and reverted the same day. If you want a new cat, this is that explicit request — just say so.

### B1. Fortune cat — three moods

One character, three expressions. The mood is a **pure function of this month's net** (`lib/catState.ts`), never random.

**Shared anatomy** (constant across all three): 100×100 viewBox. Circular gold head r=27 at centre-top. Cream oval muzzle. Rounded pill body. **Left paw raised beckoning** (the maneki-neko gesture) as a gold circle at the upper right. Right paw resting, cream ellipse. Bell collar: a gold cord swagging across the chest with a small round bell, hairline slit across it. **An oval koban coin, tilted −14°, stamped 金, resting beside the raised paw.** Three whisker strokes each side at 50% opacity.

| State | Code name | Ears | Eyes | Mouth | Reads as |
|---|---|---|---|---|---|
| **Content** | `saving` | Upright, gold triangles with **cream inner triangles** | **Closed** — two gentle arcs curving down at the centre, mirroring the smile | Soft smile, a shallow arc dipping at the centre | "Net positive. Calm, eyes shut, pleased." **This is the logo state.** |
| **Watchful** | `even` | Same upright gold-with-cream ears | Two small solid lacquer **dots**, r≈2.7 | A **straight horizontal line** | "Broke even. Neutral, attentive, no judgement." |
| **Alert** | `burning` | **Splayed wide and back** — flatter, angled outward, **no cream inner triangle** | **Wide white ovals** with lacquer outline and small off-centre pupils | Small **open vertical oval**, outline only | "Net negative. Startled, not scolding." Still gold — never red. |

Deliver at **1024×1024 transparent PNG each**, plus a single sheet with all three side by side at identical scale so I can check the head registers in the same place.

### B2. Daruma — goal talisman, 7 states

A round weighted wish-doll, 100×108 viewBox. **The progressive eye is the whole point** — you paint one eye when you set a wish, the other when it comes true.

**Anatomy:** egg-shaped lacquer body in seal red `#b1301b`, gradient from a 55%-white tint at upper-left through pure seal to an 80%-black shade at lower-right, with a soft white radial sheen at (32%, 24%). Outline is seal-mixed-70%-black. A **weighted gold base** — the bottom 18 units filled `--leaf-hi #f6d878`, a darker `--leaf-lo` band across its top edge, and a small seal-red medallion circle centred in it — **clipped to the body silhouette**. Face field: a large cream `--paper #f6ecd3` ellipse, seal-outlined. Two blush cheek circles in seal-tinted paper at 70% opacity. Two bold **crane-wing brows** — thick strokes arcing up and outward. A **handlebar mustache** — one continuous stroke, two outer curls sweeping up, dipping at the centre. All ink features in `--on-gold #2a1e05`.

**The eyes.** Two white circles r=10.5, dark-outlined.

- **Left pupil: always fully painted**, r=5. The wish is set.
- **Right pupil: grows from r=0 to r=5** as the goal fills.

Deliver **7 frames at 0%, 20%, 40%, 60%, 80%, 99%, 100%** so I can check the growth curve reads naturally. At **100%** the whole doll gains a gold drop-shadow glow — wish fulfilled.

### B3. Paper lantern — capture streak, 2 states

20×26 viewBox, drawn **1:1** (do not design large and downscale — at the old 16×21 the ribs blurred into a dot).

**Anatomy, top to bottom:** a thin hanging loop line; a trapezoid **top cap**; the **paper body** — bulging at the middle, tapering to both caps; **three horizontal rib lines**; a trapezoid **bottom cap**; a short **tassel** line.

| State | Body | Caps & tassel | Ribs | Glow |
|---|---|---|---|---|
| **Lit** (day struck) | Seal red `#b1301b`, full opacity | Gold `--leaf-hi` | `--leaf-lo` at 55% | none — daylight needs no flame |
| **Lit** (night / dark theme) | Same seal red | Same gold | Same | **Warm gold drop-shadow, 4px blur, 70% gold** — as if a candle were lit inside |
| **Unlit** | `--line` grey, 55% opacity | `--line` | `--surface` at 30% | none |

**Critical:** an unlit lantern must still read as *an empty lantern*, not a faint smudge — the unlit row carries the entire zero state.

### B4. Coins — there are **three distinct** ones, don't merge them

| Coin | Where | Shape |
|---|---|---|
| **Cash coin** (`CoinGlyph`) | Inline beside section titles, 18px | **Round, flat gold disc with a square hole** — the Chinese coin of prosperity. Gold fill, `--gold-text` outline, square rounded r=1 hole outlined in `--on-gold` at 85%. Soft gold glow. |
| **Koban** | On the cat, beside the raised paw | **Oval**, tilted −14°, gold-highlight fill with lacquer outline, stamped **金** in bold lacquer |
| **Luck medallion** (`LuckRing`) | Dashboard hero, 150px | The cat **struck into a coin**: a **reeded rim of 48 evenly-spaced radial ticks**, and a circular track r=45 whose gold arc fills clockwise 0–100% with the savings pace, glowing. A red month leaves it mostly unstruck with a single vermilion notch. **Must stay code — the arc is data-driven.** |

### B5. Nav line-icon set — 4 icons, needs a 5th

One coherent style: **24×24, stroke `currentColor`, stroke-width 1.7, round caps and joins, no fill.**

| Icon | Current drawing |
|---|---|
| **Home** | Fortune coin — circle r=9 + square hole rect r=1 |
| **Ledger** | Receipt/scroll — rectangle with a **torn zigzag bottom edge**, two horizontal text lines |
| **Fortunes** | Fortune slip/ticket — a ticket with **concave notches on both sides** and a vertical **dashed** perforation |
| **Bills** | Envelope — rounded rect with a V flap |

If you're regenerating: add **Insights** (there's an `/insights` route with no icon), and keep every one on the same 1.7 stroke — a mismatched weight is instantly visible in the bottom nav.

---

## GROUP C — emoji still in the UI

These are **system emoji**, so they render differently on every device and break the "credible tool, not a toy" line the nav icons already established. If you want to replace them, they need to be **24×24 line icons in the B5 style** — not illustrations.

Highest value first (by usage count and prominence):

| Glyph | Meaning | Where |
|---|---|---|
| ⚡ ×8 | Instant capture | `AppShell`, `TransactionList`, `LandingDemo`, `UspSection` |
| 💬 ×4 | SMS capture | `TransactionList`, `LandingDemo`, `CaptureSettings` |
| 📌 ×3 | Manual bill | `BillsDue`, `RecurringRadar`, `AppShell` |
| 💡 ×3 | Utilities / tip | `BillsDue`, `SettingsShell`, `FeedbackShell` |
| 📄 ×3 | Statement | `TransactionList`, `CaptureSettings` |
| 🚫 ×3 | Blocked sender | `ReviewQueue`, `CaptureSettings` |
| ✨ ×3 | AI tag | `AiTagBadge`, `upgrade`, `AppShell` |
| 🔭 ×2 | Recurring radar | `RecurringRadar` |
| 👀 ×2 | Needs review | `ReviewQueue`, `ReviewShell` |
| 📡 ×2 | Connected inbox | `SettingsShell`, `CaptureSettings` |
| 📮 ×2 | Forwarding address | `EmailCandidateList`, `ForwardingCard` |
| 🗡️ ×2 | Subscription kill-chain | `SubscriptionKillChain` |
| 🎁 ×1 | Pro gift | `ProShowcase` |
| 📷 📧 🖼 🎉 📊 🛒 ☕ 🔁 👤 | assorted | various |

**Already correctly drawn — leave alone:** ⚙ (gear), ☀ ☾ ◐ (theme toggle), ✦ (Pro badge), ★ ◍ ▲ ▼ ✓ ✕ (typographic marks, intentionally).

**Separate case — the 6 seeded category icons** live in the *database* (`supabase/migrations/0001`), not in code. Users can edit them. Replacing these needs a migration and a decision about existing rows:

🍜 Food & Drink · 🚌 Transport · 🛍️ Shopping · 💰 Salary · 💡 Utilities · 🎬 Entertainment

---

## Delivery format — for everything

| | |
|---|---|
| **Master files** | 2048×2048 PNG, transparent RGBA, subject centred with even margin |
| **Vector targets** (cat, Daruma, lantern, coins, icons) | Also deliver **SVG** — flat paths, no embedded raster, no `<text>` (fonts don't travel), no filters that need external refs |
| **Raster targets** (apple-icon, PWA, OG) | Exact pixel size, no upscaling |
| **Colour** | sRGB. Every hex from the palette table above — **no colour drift**, the gold is a specific gold |
| **Backgrounds** | Transparent **except** apple-icon, PWA icons, and OG — those are opaque, full-bleed |
| **Naming** | `fortune-cat--{state}.{ext}`, `daruma--{pct}.{ext}`, `lantern--{lit\|unlit}.{ext}`, `coin--{cash\|koban\|medallion}.{ext}`, `icon--{name}.svg` |
| **Drop location** | `design/generated/` — I'll place the ones that ship and leave the rest as reference |
| **Dark-mode check** | Every asset must be legible on **both** `#ffffff` and `#0a0e1c`. The cat's hardcoded palette exists precisely for this — don't "fix" it to a lighter gold |

---

## If you generate the cat, add this to every prompt

> Flat vector illustration, gold leaf with a dark brown lacquer outline of even weight, cream accents. Front-facing, symmetrical, no perspective. No gradients other than a single vertical gold highlight-to-base. No red anywhere. No drop shadows, no texture, no background. Clean closed paths suitable for tracing to SVG.

Want me to package this as a shareable spec sheet with rendered swatches and the three cat states side by side? One artifact, one link.