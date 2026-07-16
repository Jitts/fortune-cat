/**
 * Foreign-exchange conversion at capture time. Uses Frankfurter (ECB reference
 * rates, keyless, free) so the app stays zero-API-key like the rest of the
 * intelligence layer. Converts a captured amount into the user's OWN base
 * currency; converted amounts always route through review — the user confirms
 * the rate before anything enters the ledger. (For a Singapore user the base is
 * SGD, so this behaves exactly as it always did.)
 */

export type FxResult = {
  base: number;
  rate: number;
};

export async function convertToBase(
  amount: number,
  currency: string,
  baseCurrency: string,
): Promise<FxResult | null> {
  if (currency === baseCurrency) return { base: amount, rate: 1 };
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(currency)}&symbols=${encodeURIComponent(baseCurrency)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[baseCurrency];
    if (typeof rate !== "number" || rate <= 0) return null;
    return { base: Math.round(amount * rate * 100) / 100, rate };
  } catch {
    return null;
  }
}
