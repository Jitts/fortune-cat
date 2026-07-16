/**
 * Region reference data (no I/O, no LLM): maps an ISO country to its default
 * currency, formatting locale, and timezone. Powers the onboarding country
 * picker and the auto-selected currency. The user can override the currency
 * if the default is wrong for them.
 *
 * Singapore is the app's home market and the fallback for every missing value,
 * so a user with no profile (or a not-yet-applied migration) always renders in
 * SGD / en-SG / Asia-Singapore exactly as before.
 *
 * Timezone is a single sensible default per country (capital / most-populous
 * zone); countries that span several zones can be refined later without
 * changing currency behaviour.
 */

export type Region = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currency: string; // ISO 4217
  locale: string; // BCP-47
  timezone: string; // IANA
  flag: string;
};

// Ordered for the picker: the home market and its neighbours first, then the
// rest alphabetically by name.
export const REGIONS: Region[] = [
  { code: "SG", name: "Singapore", currency: "SGD", locale: "en-SG", timezone: "Asia/Singapore", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", currency: "MYR", locale: "en-MY", timezone: "Asia/Kuala_Lumpur", flag: "🇲🇾" },
  { code: "ID", name: "Indonesia", currency: "IDR", locale: "id-ID", timezone: "Asia/Jakarta", flag: "🇮🇩" },
  { code: "TH", name: "Thailand", currency: "THB", locale: "th-TH", timezone: "Asia/Bangkok", flag: "🇹🇭" },
  { code: "PH", name: "Philippines", currency: "PHP", locale: "en-PH", timezone: "Asia/Manila", flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", currency: "VND", locale: "vi-VN", timezone: "Asia/Ho_Chi_Minh", flag: "🇻🇳" },
  { code: "HK", name: "Hong Kong", currency: "HKD", locale: "en-HK", timezone: "Asia/Hong_Kong", flag: "🇭🇰" },
  { code: "AU", name: "Australia", currency: "AUD", locale: "en-AU", timezone: "Australia/Sydney", flag: "🇦🇺" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", locale: "en-AE", timezone: "Asia/Dubai", flag: "🇦🇪" },
  { code: "BR", name: "Brazil", currency: "BRL", locale: "pt-BR", timezone: "America/Sao_Paulo", flag: "🇧🇷" },
  { code: "CA", name: "Canada", currency: "CAD", locale: "en-CA", timezone: "America/Toronto", flag: "🇨🇦" },
  { code: "CN", name: "China", currency: "CNY", locale: "zh-CN", timezone: "Asia/Shanghai", flag: "🇨🇳" },
  { code: "DE", name: "Germany", currency: "EUR", locale: "de-DE", timezone: "Europe/Berlin", flag: "🇩🇪" },
  { code: "DK", name: "Denmark", currency: "DKK", locale: "da-DK", timezone: "Europe/Copenhagen", flag: "🇩🇰" },
  { code: "ES", name: "Spain", currency: "EUR", locale: "es-ES", timezone: "Europe/Madrid", flag: "🇪🇸" },
  { code: "FR", name: "France", currency: "EUR", locale: "fr-FR", timezone: "Europe/Paris", flag: "🇫🇷" },
  { code: "GB", name: "United Kingdom", currency: "GBP", locale: "en-GB", timezone: "Europe/London", flag: "🇬🇧" },
  { code: "IE", name: "Ireland", currency: "EUR", locale: "en-IE", timezone: "Europe/Dublin", flag: "🇮🇪" },
  { code: "IN", name: "India", currency: "INR", locale: "en-IN", timezone: "Asia/Kolkata", flag: "🇮🇳" },
  { code: "IT", name: "Italy", currency: "EUR", locale: "it-IT", timezone: "Europe/Rome", flag: "🇮🇹" },
  { code: "JP", name: "Japan", currency: "JPY", locale: "ja-JP", timezone: "Asia/Tokyo", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", currency: "KRW", locale: "ko-KR", timezone: "Asia/Seoul", flag: "🇰🇷" },
  { code: "MX", name: "Mexico", currency: "MXN", locale: "es-MX", timezone: "America/Mexico_City", flag: "🇲🇽" },
  { code: "NL", name: "Netherlands", currency: "EUR", locale: "nl-NL", timezone: "Europe/Amsterdam", flag: "🇳🇱" },
  { code: "NO", name: "Norway", currency: "NOK", locale: "nb-NO", timezone: "Europe/Oslo", flag: "🇳🇴" },
  { code: "NZ", name: "New Zealand", currency: "NZD", locale: "en-NZ", timezone: "Pacific/Auckland", flag: "🇳🇿" },
  { code: "PT", name: "Portugal", currency: "EUR", locale: "pt-PT", timezone: "Europe/Lisbon", flag: "🇵🇹" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", locale: "ar-SA", timezone: "Asia/Riyadh", flag: "🇸🇦" },
  { code: "SE", name: "Sweden", currency: "SEK", locale: "sv-SE", timezone: "Europe/Stockholm", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", currency: "CHF", locale: "de-CH", timezone: "Europe/Zurich", flag: "🇨🇭" },
  { code: "TW", name: "Taiwan", currency: "TWD", locale: "zh-TW", timezone: "Asia/Taipei", flag: "🇹🇼" },
  { code: "US", name: "United States", currency: "USD", locale: "en-US", timezone: "America/New_York", flag: "🇺🇸" },
  { code: "ZA", name: "South Africa", currency: "ZAR", locale: "en-ZA", timezone: "Africa/Johannesburg", flag: "🇿🇦" },
];

/** The home market — also the fallback whenever a profile value is missing. */
export const DEFAULT_REGION: Region = REGIONS[0];

const BY_COUNTRY = new Map(REGIONS.map((r) => [r.code, r]));

/** Look up a region by ISO country code (case-insensitive). Null if unknown. */
export function regionForCountry(code: string | null | undefined): Region | null {
  if (!code) return null;
  return BY_COUNTRY.get(code.toUpperCase()) ?? null;
}

/** The default currency for a country, or SGD if the country is unknown. */
export function currencyForCountry(code: string | null | undefined): string {
  return regionForCountry(code)?.currency ?? DEFAULT_REGION.currency;
}

/** Every distinct currency we know, sorted — for the "currency is wrong?" override. */
export const CURRENCIES: string[] = Array.from(new Set(REGIONS.map((r) => r.currency))).sort();
