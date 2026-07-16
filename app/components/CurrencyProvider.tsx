"use client";

import { createContext, useContext, useMemo } from "react";
import { formatCurrency, DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/format";

/**
 * The user's money formatting, shared through the tree so every card renders in
 * their base currency without prop-threading. Fed once at the app shell from
 * the profile; defaults to SGD / en-SG so anything rendered outside a provider
 * (or before onboarding) still formats exactly as the app always did.
 */
type Money = {
  currency: string;
  locale: string;
  format: (amount: number) => string;
};

const MoneyContext = createContext<Money>({
  currency: DEFAULT_CURRENCY,
  locale: DEFAULT_LOCALE,
  format: (amount) => formatCurrency(amount),
});

export function CurrencyProvider({
  currency,
  locale,
  children,
}: {
  currency: string;
  locale: string;
  children: React.ReactNode;
}) {
  const value = useMemo<Money>(
    () => ({ currency, locale, format: (amount) => formatCurrency(amount, currency, locale) }),
    [currency, locale],
  );
  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

/** `const { format } = useMoney()` — a formatter bound to the user's currency. */
export function useMoney(): Money {
  return useContext(MoneyContext);
}
