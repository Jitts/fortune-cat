---
name: Fortune Cat
colors:
  surface: '#faf8ff'
  surface-dim: '#d4d9ed'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e2e8fc'
  surface-container-highest: '#dde2f6'
  on-surface: '#151b29'
  on-surface-variant: '#4d4732'
  inverse-surface: '#2a303f'
  inverse-on-surface: '#edf0ff'
  outline: '#7e775f'
  outline-variant: '#d0c6ab'
  surface-tint: '#705d00'
  primary: '#705d00'
  on-primary: '#ffffff'
  primary-container: '#ffd700'
  on-primary-container: '#705e00'
  inverse-primary: '#e9c400'
  secondary: '#b7102a'
  on-secondary: '#ffffff'
  secondary-container: '#db313f'
  on-secondary-container: '#fffbff'
  tertiary: '#5e5e5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#dbdad6'
  on-tertiary-container: '#5f5f5c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe16d'
  primary-fixed-dim: '#e9c400'
  on-primary-fixed: '#221b00'
  on-primary-fixed-variant: '#544600'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3b1'
  on-secondary-fixed: '#410007'
  on-secondary-fixed-variant: '#92001c'
  tertiary-fixed: '#e4e2de'
  tertiary-fixed-dim: '#c8c6c3'
  on-tertiary-fixed: '#1b1c1a'
  on-tertiary-fixed-variant: '#474744'
  background: '#faf8ff'
  on-background: '#151b29'
  surface-variant: '#dde2f6'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system is inspired by the *Maneki-neko*, the traditional Japanese "beckoning cat" symbol of good luck and prosperity. The brand personality is auspicious, welcoming, and dependable, aiming to evoke a sense of financial optimism and professional warmth. 

The design style is **Corporate Modern with a Minimalist touch**, utilizing generous whitespace, clean geometry, and subtle cultural motifs. It balances the "vibrant energy" of luck with the "grounded reliability" of a modern financial or service application. The UI should feel high-end but accessible, avoiding excessive clutter to let the bold accent colors drive the narrative of growth and fortune.

## Colors

The palette is built on the triad of prosperity: Gold, Red, and Cream.

- **Primary (Gold):** Used for highlights, success states, and primary calls to action that signify value and "fortune." 
- **Secondary (Red):** Used for urgent notifications, high-energy accents, and traditional "luck" motifs. It should be used sparingly to maintain professional balance.
- **Surface (Cream/Off-White):** The light mode foundation, providing a softer, more premium feel than pure white.
- **Neutral (Charcoal/Navy):** Provides the structural weight and depth. In Dark Mode, this becomes the primary surface color to ensure legibility and a sophisticated, "night-market" aesthetic.

**Color Mode Behavior:**
- **Light Mode:** Uses the Cream (#FDFBF7) as the base surface with Charcoal text.
- **Dark Mode:** Uses a deep Charcoal (#121826) as the base surface with the Gold and Red accents adjusted for high-contrast accessibility against dark backgrounds.

## Typography

The design system utilizes **Plus Jakarta Sans** across all levels to maintain a cohesive, friendly, and modern appearance. 

Titles are rendered with heavy weights (Bold/ExtraBold) and tight letter-spacing to create a "prosperous" and confident impact. Body text remains light and airy to ensure readability. For mobile screens, headline sizes scale down slightly to prevent awkward line breaks while maintaining their distinctive weight.

## Layout & Spacing

This design system employs a **Fluid Grid** model based on a 4px baseline unit. 

- **Desktop:** A 12-column grid with a maximum content width of 1280px. Gutters are fixed at 24px to provide ample "breathability."
- **Tablet:** An 8-column grid with 20px gutters.
- **Mobile:** A 4-column grid with 16px margins.

Spacing follows a geometric progression (4, 8, 16, 24, 48, 80). Large "XL" spacing should be used between major sections to emphasize the minimalist, premium feel of the brand.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** rather than heavy shadows. 

- **Level 0 (Base):** The primary surface color (Cream in light, Charcoal in dark).
- **Level 1 (Cards):** A slightly lighter or darker tint of the base color with a very soft, 10% opacity ambient shadow (Gold-tinted in light mode, Navy-tinted in dark mode).
- **Level 2 (Modals/Popovers):** Features a 1px "Gold" or "Off-white" low-contrast outline to define boundaries without adding visual weight.

In Dark Mode, depth is primarily achieved through subtle variations in surface luminance (lighter grays for closer elements).

## Shapes

The shape language is **Rounded**, reflecting the soft, organic curves of the Maneki-neko. 

Standard components use a 0.5rem (8px) radius. Larger containers, such as promotional cards or main navigation drawers, utilize `rounded-xl` (1.5rem) to evoke a friendly and approachable character. Circles are used exclusively for avatars and status indicators.

## Components

- **Buttons:** Primary buttons are Gold with bold Charcoal text. Secondary buttons use a Red outline with Red text for high-visibility actions (like "Claim" or "Alerts"). Interactive states should include a subtle scale-up (1.02x) on hover to feel "responsive."
- **Input Fields:** Use a subtle Cream-tinted background (in Light mode) with a 1px border that turns Gold on focus.
- **Cards:** Feature "Rounded" corners and a very soft ambient shadow. For "Lucky" or "Featured" content, a thin Gold top-border can be applied.
- **Chips/Badges:** Small, pill-shaped elements. Use Red backgrounds for urgent status and Gold for "Premium" or "Successful" states.
- **Lists:** Clean, borderless entries separated by generous vertical padding (16px). Use chevron icons in Gold to indicate drill-down actions.
- **Progress Bars:** Thick, rounded tracks. The progress fill should be a Gold-to-Red subtle linear gradient to symbolize energy and movement toward a goal.