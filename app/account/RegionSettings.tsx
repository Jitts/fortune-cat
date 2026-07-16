"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import CountrySelect from "@/app/welcome/CountrySelect";
import { regionForCountry, CURRENCIES, DEFAULT_REGION } from "@/lib/regions";
import { formatCurrency } from "@/lib/format";
import { updateRegion } from "./actions";

/**
 * Change country / currency after onboarding — for anyone who picked wrong at
 * setup. Reuses the onboarding combobox. Currency follows the country but can
 * be overridden. Saving relabels money app-wide (via router.refresh); it does
 * not convert numbers already logged, so we say so plainly.
 */
export default function RegionSettings({
  initialCountry,
  initialCurrency,
}: {
  initialCountry: string | null;
  initialCurrency: string;
}) {
  const router = useRouter();
  const [country, setCountry] = useState(initialCountry ?? DEFAULT_REGION.code);
  const [currency, setCurrency] = useState(initialCurrency);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const region = regionForCountry(country) ?? DEFAULT_REGION;
  const sample = formatCurrency(1234.5, currency, region.locale);

  function onCountry(code: string) {
    setCountry(code);
    setCurrency((regionForCountry(code) ?? DEFAULT_REGION).currency);
    setDirty(true);
    setSaved(false);
  }

  function onCurrency(c: string) {
    setCurrency(c);
    setDirty(true);
    setSaved(false);
  }

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set("country", country);
    fd.set("currency", currency);
    startTransition(async () => {
      const res = await updateRegion(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDirty(false);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <h2 className="text-sm font-medium text-ink-subtle">Region &amp; currency</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Sets how your money reads and when your day rolls over. Picked the wrong one at setup? Fix it here.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-ink-subtle">Country</span>
          <CountrySelect value={country} onChange={onCountry} />
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-ink-subtle">Currency</span>
          <select
            value={currency}
            onChange={(e) => onCurrency(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-action focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-ink-faint">Preview</span>
        <span className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{sample}</span>
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        Changing currency relabels amounts — it doesn&apos;t convert the numbers you&apos;ve already logged. Best set before you record a lot.
      </p>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4">
        <button
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90 disabled:opacity-40"
        >
          {pending ? "Saving…" : saved && !dirty ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}
