import {
  SG, MY, ID, TH, PH, VN, HK, AU, AE, BR, CA, CN, DE, DK, ES, FR, GB, IE, IN,
  IT, JP, KR, MX, NL, NO, NZ, PT, SA, SE, CH, TW, US, ZA,
  type FlagComponent,
} from "country-flag-icons/react/3x2";

/**
 * Real SVG flags (not emoji) keyed by ISO country code — Windows Chrome/Edge
 * ship no flag-emoji glyphs, so a "🇸🇬" collapses to the letters "SG". These
 * inline components render everywhere. Only the countries we list get bundled.
 */
export const FLAGS: Record<string, FlagComponent> = {
  SG, MY, ID, TH, PH, VN, HK, AU, AE, BR, CA, CN, DE, DK, ES, FR, GB, IE, IN,
  IT, JP, KR, MX, NL, NO, NZ, PT, SA, SE, CH, TW, US, ZA,
};
