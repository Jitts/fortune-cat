# Asset generation — three mockups for approval

Status: **not yet generated.** Blocked on the Hugging Face MCP connection (see
"Running these" at the bottom). Nothing in this folder is an image yet.

Source of truth for what the app actually needs: `ASSET-SPEC.md`, next to this file.

---

## Palette — every prompt is locked to this

**Cat mark — hardcoded, deliberately theme-independent.** It has to read on both
cream and midnight, so it never picks up a theme token.

| Role | Hex | How to say it to a diffusion model |
|---|---|---|
| Gold leaf, base | `#e8bd54` | "antique gold" |
| Gold leaf, highlight | `#f4d888` | "lighter gold at the crown" |
| Lacquer outline | `#6f4e0d` | "bold dark-brown lacquer outline, even thickness" |
| Cream | `#fbf3dd` | "pale cream" |
| Bell cord | `#cf9528` | "muted gold cord" |

**Hard rule, in every negative prompt:** red / vermilion / crimson **never**
appears on the cat. Attention lives elsewhere in the UI. Gold and lacquer only.

Diffusion models do not honour hex codes. The hexes are the target for the
hand-trace afterwards, not something the generator will hit.

---

## 1 · Cat head mark → source art for `app/icon.svg`

- **Model:** `mcp-tools/FLUX.1-Krea-dev` (fall back to `mcp-tools/Qwen-Image-Fast`)
- **aspect_ratio:** `1:1`
- **seed:** `3`, `randomize_seed: false`

```
A flat vector app icon of a Japanese maneki-neko fortune cat head, front-facing,
perfectly symmetrical. Solid antique gold with a soft lighter gold highlight at the
top of the head. Bold dark-brown lacquer outline of even thickness around every
shape. Two triangular ears with pale cream inner triangles. Eyes closed and content
— two gentle downward arcs. Small pale cream muzzle. Clean geometric shapes,
generous negative space, designed to stay readable when shrunk to 16 pixels.
Centred on a plain flat background. Modern minimal logo, sticker style.
```

**negative_prompt:**
```
text, watermark, letters, red, vermilion, crimson, whiskers, bell, collar, body,
coin, photorealistic, 3d render, shadow, gradient background, busy detail,
multiple cats, asymmetry
```

> **This will not come back as SVG.** No diffusion model emits vector. It is a
> drawing to hand-trace into `app/icon.svg` so the mark keeps its 32px legibility
> and its transparent background. Approve it as reference art, not as a file.
> Whiskers, bell, koban and body are excluded on purpose — the spec found they
> turn to mud at 16px.

---

## 2 · Full-body cat → hero art for the landing pages

- **Model:** `mcp-tools/FLUX.1-Krea-dev` (fall back to `mcp-tools/Qwen-Image-Fast`)
- **aspect_ratio:** `3:4`
- **seed:** `11`, `randomize_seed: false`

```
A seated Japanese maneki-neko fortune cat rendered in flat antique gold leaf with a
bold dark-brown lacquer outline of even thickness, one paw raised in the beckoning
gesture. Pale cream muzzle and inner ears, a muted gold bell cord at the neck. A
single struck oval gold koban coin catching the light near the raised paw. Near
symmetrical, upright, calm and content expression with closed eyes. Generous
negative space around the figure, plain flat background, flat vector illustration.
```

**negative_prompt:**
```
text, watermark, red, vermilion, crimson, photorealistic, 3d render, fur texture,
drop shadow, busy background, multiple cats, angry, cartoon eyes
```

> Feeds the hero slot on A2/A2a and the OG card. The existing `FortuneCat` React
> component is NOT to be redrawn from this without an explicit go-ahead — this is
> for the landing pages first.

---

## 3 · OG social card → `app/opengraph-image`

- **Model:** `mcp-tools/Qwen-Image` (chosen specifically for text placement)
- **aspect_ratio:** `16:9` — crop to 1200×630 afterwards
- **seed:** `7`, `randomize_seed: false`

```
A wide social-media banner. Background: a deep warm charcoal-brown radial glow in
the upper right fading to near-black at the edges. On the right side, a Japanese
maneki-neko fortune cat rendered in flat antique gold leaf with a bold dark-brown
lacquer outline of even thickness, sitting upright, one paw raised, about
two-thirds the height of the banner. A single struck oval gold koban coin catching
the light near the raised paw. On the left half, large clean geometric sans-serif
text in warm off-white reading "Your money logs itself." and beneath it a smaller
line in gold reading "Fortune Cat". Generous margins, nothing touching the edges.
Minimal, elegant, high contrast, flat vector illustration, no photographic texture.
```

**negative_prompt:**
```
watermark, copyright, blurry, low resolution, red, vermilion, crimson, cluttered,
gibberish text, misspelled words, extra text, busy background, drop shadow
```

> **The baked-in text is the experiment.** Qwen is genuinely good at type, but if
> the lettering comes back malformed the fallback is to keep the art and composite
> the real Bricolage Grotesque over it in `next/og` — which is arguably better
> anyway, because then the headline stays editable and the safe margins are exact.

---

## What is deliberately NOT generated

`ASSET-SPEC.md` argues against generating most of Group A, and that still holds:

- **A2 `apple-icon.png` (180), A3 PWA icons (192 / 512 / 512-maskable).** These must
  be the *same mark* as A1 at exact hexes with exact centring. Once A1 exists as
  SVG, rendering these deterministically from it is exact and free. Generating them
  separately would only introduce drift between the favicon and the home-screen icon.
- **A5 `twitter-image`.** Next silently reuses the OG image. Skip unless a distinct
  crop is wanted.

---

## Running these

Requires the HF MCP server connected **with a `gradio=` parameter naming the
Spaces** — the bare `?login` endpoint defaults to `gradio=none`, which allows
discovery but refuses every `invoke`.

```
https://huggingface.co/mcp?login&gradio=mcp-tools/FLUX.1-Krea-dev,mcp-tools/Qwen-Image,mcp-tools/Qwen-Image-Fast
```

Re-adding the server mid-session is not enough — MCP connections bind at session
start, so Claude Code has to be restarted before the new URL takes effect.

`mcp-tools/FLUX.1-Krea-dev` was returning HTTP 503 (asleep) throughout. If it is
still down, run 1 and 2 through `mcp-tools/Qwen-Image-Fast` and say so in the
handover — the two models have visibly different line quality and it matters which
one the traced mark came from.

Save output to this folder as `01-head-mark.png`, `02-full-body.png`,
`03-og-card.png`.
