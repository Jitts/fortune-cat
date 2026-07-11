/**
 * Foreign-exchange conversion at capture time. Uses Frankfurter (ECB reference
 * rates, keyless, free) so the app stays zero-API-key like the rest of the
 * intelligence layer. Converted amounts always route through review — the user
 * confirms the rate before anything enters the ledger.
 */

export type FxResult = {
  sgd: number;
  rate: number;
};

export async function convertToSgd(amount: number, currency: string): Promise<FxResult | null> {
  if (currency === "SGD") return { sgd: amount, rate: 1 };
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(currency)}&symbols=SGD`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: { SGD?: number } };
    const rate = data.rates?.SGD;
    if (typeof rate !== "number" || rate <= 0) return null;
    return { sgd: Math.round(amount * rate * 100) / 100, rate };
  } catch {
    return null;
  }
}
