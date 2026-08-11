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
  // Net decides the mood, because net is what the luck ring draws. This used to
  // read `net < 0 || burnDelta > 30`, which let a fast-spending month flip the
  // cat to "burning" while it was still net-positive — so the rail printed
  // "Ears back · luck is thin" directly above a ring showing 91% saved. In a
  // money tool a mascot that disagrees with the arithmetic beside it isn't
  // charm, it's misinformation, and it scolds someone who is doing well.
  //
  // Pace hasn't been thrown away: it outranks nothing, but it still breaks the
  // tie at exactly zero, and CatRail now prints it as a subordinate caveat
  // under the headline instead of overriding the headline.
  if (net < 0) return "burning";
  if (net > 0) return "saving";
  return burnDelta != null && burnDelta > 30 ? "burning" : "even";
}
