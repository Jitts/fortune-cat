"use client";

import { useState, useTransition } from "react";
import { saveProfile } from "./actions";
import { regionForCountry, CURRENCIES, DEFAULT_REGION } from "@/lib/regions";
import { formatCurrency } from "@/lib/format";
import CountrySelect from "./CountrySelect";

/**
 * One-step onboarding: pick your country, and the currency auto-selects (you can
 * change it if it's wrong). A live sample shows exactly how your money will read.
 */
export default function WelcomeForm() {
  const [country, setCountry] = useState(DEFAULT_REGION.code);
  const [currency, setCurrency] = useState(DEFAULT_REGION.currency);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const region = regionForCountry(country) ?? DEFAULT_REGION;

  // Picking a country resets the currency to that country's default; the user
  // can then override it below if their money is actually in another currency.
  function onCountry(code: string) {
    setCountry(code);
    setCurrency((regionForCountry(code) ?? DEFAULT_REGION).currency);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("country", country);
    fd.set("currency", currency);
    startTransition(async () => {
      const res = await saveProfile(fd);
      if (res?.error) setError(res.error);
    });
  }

  const sample = formatCurrency(1234.5, currency, region.locale);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-6 rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-line"
      >
        <div className="text-center">
          <p className="text-3xl">🐱</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Welcome to Fortune Cat</h1>
          <p className="mt-2 text-sm text-ink-subtle">
            Where are you? We&apos;ll show your money the way you expect it.
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink-muted">Country</span>
          <CountrySelect value={country} onChange={onCountry} />
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink-muted">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-action focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="text-xs text-ink-faint">
            Auto-selected from your country — change it if your money is in another currency.
          </span>
        </label>

        <div className="rounded-lg bg-surface-2 px-4 py-3 text-center">
          <p className="text-xs text-ink-faint">Your money will look like</p>
          <p className="mt-0.5 text-lg font-semibold text-ink [font-variant-numeric:tabular-nums]">{sample}</p>
        </div>

        {error && <p className="text-sm text-vermilion">{error}</p>}

        <button type="submit" disabled={pending} className="btn btn-gold w-full px-4 py-3.5 text-[15px]">
          {pending ? "Setting up…" : "Start tracking →"}
        </button>
      </form>
    </main>
  );
}
