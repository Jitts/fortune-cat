/**
 * The cat's mood, as a pure function of this month's cash flow. No AI, no
 * randomness: saving = content, even = watchful, burning = alert.
 *
 * Lives in lib/ rather than beside the SVG because both sides need it from
 * different runtimes: `FortuneCat.tsx` is a client component (it needs useId
 * to keep each instance's gradient unique), while `lib/fortune.ts` calls this
 * on the server when drawing the daily slip. Keeping the logic here means the
 * server never has to import the client module to ask what mood the cat is in.
 */

export type CatState = "saving" | "even" | "burning";

export function catState(net: number, burnDelta: number | null): CatState {
  if (net < 0 || (burnDelta != null && burnDelta > 30)) return "burning";
  if (net > 0) return "saving";
  return "even";
}
