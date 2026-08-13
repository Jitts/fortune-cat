"use client";

import { createContext, useContext, useMemo } from "react";
import {
  formatCurrency,
  formatDateIn,
  formatNumberIn,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
} from "@/lib/format";

/**
 * The user's money AND date formatting, shared through the tree so every card
 * renders in their base currency, locale and timezone without prop-threading.
 * Fed once at the app shell from the profile; defaults to SGD / en-SG /
 * Asia/Singapore so anything rendered outside a provider (or before onboarding)
 * still formats exactly as the app always did.
 *
 * Dates live here rather than at each call site because they kept getting it
 * wrong: eleven components had a literal "en-SG" (and lib/format's old
 * formatDate a literal "en-US"), so every non-Singapore reader saw Singapore
 * dates. `formatDate` also encodes the calendar-date vs instant rule — see
 * formatDateIn.
 */
type Money = {
  currency: string;
  locale: string;
  timezone: string;
  format: (amount: number) => string;
  formatDate: (value: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string;
};

const MoneyContext = createContext<Money>({
  currency: DEFAULT_CURRENCY,
  locale: DEFAULT_LOCALE,
  timezone: DEFAULT_TIMEZONE,
  format: (amount) => formatCurrency(amount),
  formatDate: (value, opts) => formatDateIn(value, DEFAULT_LOCALE, DEFAULT_TIMEZONE, opts),
  formatNumber: (value, opts) => formatNumberIn(value, DEFAULT_LOCALE, opts),
});

export function CurrencyProvider({
  currency,
  locale,
  timezone = DEFAULT_TIMEZONE,
  children,
}: {
  currency: string;
  locale: string;
  timezone?: string;
  children: React.ReactNode;
}) {
  const value = useMemo<Money>(
    () => ({
      currency,
      locale,
      timezone,
      format: (amount) => formatCurrency(amount, currency, locale),
      formatDate: (v, opts) => formatDateIn(v, locale, timezone, opts),
      formatNumber: (v, opts) => formatNumberIn(v, locale, opts),
    }),
    [currency, locale, timezone],
  );
  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

/** `const { format, formatDate } = useMoney()` — formatters bound to the profile. */
export function useMoney(): Money {
  return useContext(MoneyContext);
}
