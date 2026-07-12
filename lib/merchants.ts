import type { CategoryName } from "@/lib/tagger";

/**
 * SG merchant brain (rules, no LLM): a local dictionary that turns the raw
 * strings banks print — "PAYNOW YAKUN@NEX REF88291", "BUS/MRT 441192883",
 * "GIRO-SP SERVICES" — into names people recognise, with the right category
 * and GIRO-biller recognition. First match wins, so specific patterns
 * (GRABFOOD) sit above generic ones (GRAB).
 */

export type MerchantMatch = {
  name: string;
  category: CategoryName | null;
  /** Recognised recurring biller (GIRO / subscription) — radar raw material. */
  biller: boolean;
};

type Rule = {
  match: RegExp; // tested against the uppercased raw string
  name: string;
  category: CategoryName | null;
  biller?: boolean;
};

const RULES: Rule[] = [
  // ---- transport (specific before generic) ----
  { match: /BUS\/MRT|SIMPLYGO|TRANSITLINK|TRANSIT LINK|EZ-?LINK/, name: "SimplyGo · bus/MRT", category: "Transport" },
  { match: /GRABFOOD|GRAB\s*FOOD/, name: "GrabFood", category: "Food & Drink" },
  { match: /GRABPAY TOP|GRAB TOP-?UP/, name: "GrabPay top-up", category: null },
  { match: /\bGRAB\b|GRAB\*/, name: "Grab", category: "Transport" },
  { match: /GOJEK/, name: "Gojek", category: "Transport" },
  { match: /\bTADA\b/, name: "TADA", category: "Transport" },
  { match: /COMFORTDELGRO|CDG\s*TAXI|COMFORT TAXI/, name: "ComfortDelGro Taxi", category: "Transport" },
  { match: /\bSMRT\b/, name: "SMRT", category: "Transport" },
  { match: /CALTEX/, name: "Caltex", category: "Transport" },
  { match: /\bESSO\b/, name: "Esso", category: "Transport" },
  { match: /\bSHELL\b/, name: "Shell", category: "Transport" },
  { match: /\bSPC\b/, name: "SPC", category: "Transport" },
  { match: /PARKING\.SG|URA\s*PARK|HDB\s*PARK|SEASON PARKING/, name: "Parking", category: "Transport" },
  { match: /\bERP\b/, name: "ERP", category: "Transport" },

  // ---- food & drink ----
  { match: /YA\s*KUN|YAKUN/, name: "Ya Kun Kaya Toast", category: "Food & Drink" },
  { match: /TOAST\s*BOX/, name: "Toast Box", category: "Food & Drink" },
  { match: /KOPITIAM/, name: "Kopitiam", category: "Food & Drink" },
  { match: /KOUFU/, name: "Koufu", category: "Food & Drink" },
  { match: /FOOD\s*REPUBLIC/, name: "Food Republic", category: "Food & Drink" },
  { match: /FOOD\s*PANDA|FOODPANDA/, name: "foodpanda", category: "Food & Drink" },
  { match: /DELIVEROO/, name: "Deliveroo", category: "Food & Drink" },
  { match: /MCDONALD|MCD\b/, name: "McDonald's", category: "Food & Drink" },
  { match: /\bKFC\b/, name: "KFC", category: "Food & Drink" },
  { match: /STARBUCKS/, name: "Starbucks", category: "Food & Drink" },
  { match: /COFFEE\s*BEAN/, name: "The Coffee Bean & Tea Leaf", category: "Food & Drink" },
  { match: /\bLIHO\b|LI\s*HO/, name: "LiHO", category: "Food & Drink" },
  { match: /\bKOI\s|KOI\s*THE|\bKOI$/, name: "KOI Thé", category: "Food & Drink" },
  { match: /GONG\s*CHA/, name: "Gong Cha", category: "Food & Drink" },
  { match: /DIN\s*TAI\s*FUNG/, name: "Din Tai Fung", category: "Food & Drink" },
  { match: /BREADTALK/, name: "BreadTalk", category: "Food & Drink" },
  { match: /OLD\s*CHANG\s*KEE/, name: "Old Chang Kee", category: "Food & Drink" },
  { match: /HAWKER/, name: "Hawker centre", category: "Food & Drink" },

  // ---- groceries (Food & Drink bucket) ----
  { match: /UNITY BY FAIRPRICE|NTUC\s*FP\b|NTUC\s*F(AI)?RPR?ICE|FAIRPRICE/, name: "FairPrice", category: "Food & Drink" },
  { match: /COLD\s*STORAGE/, name: "Cold Storage", category: "Food & Drink" },
  { match: /SHENG\s*SIONG/, name: "Sheng Siong", category: "Food & Drink" },
  { match: /\bGIANT\b/, name: "Giant", category: "Food & Drink" },
  { match: /DON\s*DON\s*DONKI|DONKI/, name: "Don Don Donki", category: "Food & Drink" },

  // ---- utilities & billers ----
  { match: /SP\s*SERVICES|SP\s*GROUP|SPSVCS|SP\s*DIGITAL/, name: "SP Services", category: "Utilities", biller: true },
  { match: /SINGTEL/, name: "Singtel", category: "Utilities", biller: true },
  { match: /STARHUB/, name: "StarHub", category: "Utilities", biller: true },
  { match: /\bM1\b|M1\s*LIMITED/, name: "M1", category: "Utilities", biller: true },
  { match: /SIMBA\s*TELECOM|\bSIMBA\b/, name: "Simba", category: "Utilities", biller: true },
  { match: /CIRCLES\.?LIFE/, name: "Circles.Life", category: "Utilities", biller: true },
  { match: /MYREPUBLIC/, name: "MyRepublic", category: "Utilities", biller: true },
  { match: /VIEWQWEST/, name: "ViewQwest", category: "Utilities", biller: true },
  { match: /\bPUB\b.*WATER|PUB\s*BILL/, name: "PUB", category: "Utilities", biller: true },
  { match: /SENOKO/, name: "Senoko Energy", category: "Utilities", biller: true },
  { match: /GENECO/, name: "Geneco", category: "Utilities", biller: true },
  { match: /KEPPEL\s*ELECTRIC/, name: "Keppel Electric", category: "Utilities", biller: true },
  { match: /TUAS\s*POWER/, name: "Tuas Power", category: "Utilities", biller: true },
  { match: /TOWN\s*COUNCIL|S&CC/, name: "Town Council S&CC", category: "Utilities", biller: true },
  { match: /\bIRAS\b/, name: "IRAS", category: null, biller: true },
  { match: /\bHDB\b(?!\s*PARK)/, name: "HDB", category: null, biller: true },
  { match: /\bAIA\b/, name: "AIA", category: null, biller: true },
  { match: /PRUDENTIAL|\bPRU\b/, name: "Prudential", category: null, biller: true },
  { match: /GREAT\s*EASTERN/, name: "Great Eastern", category: null, biller: true },
  { match: /NTUC\s*INCOME|\bINCOME\s*INSURANCE/, name: "Income Insurance", category: null, biller: true },
  { match: /SINGLIFE/, name: "Singlife", category: null, biller: true },

  // ---- entertainment & subscriptions ----
  { match: /NETFLIX/, name: "Netflix", category: "Entertainment", biller: true },
  { match: /SPOTIFY/, name: "Spotify", category: "Entertainment", biller: true },
  { match: /DISNEY\s*(PLUS|\+)/, name: "Disney+", category: "Entertainment", biller: true },
  { match: /YOUTUBE\s*PREMIUM|GOOGLE\s*YOUTUBE/, name: "YouTube Premium", category: "Entertainment", biller: true },
  { match: /APPLE\.COM\/BILL|ITUNES|APPLE\s*SERVICES/, name: "Apple services", category: "Entertainment", biller: true },
  { match: /ICLOUD/, name: "iCloud+", category: "Entertainment", biller: true },
  { match: /GOLDEN\s*VILLAGE|\bGV\b/, name: "Golden Village", category: "Entertainment" },
  { match: /CATHAY\s*CINE/, name: "Cathay Cineplexes", category: "Entertainment" },
  { match: /SHAW\s*THEATRE/, name: "Shaw Theatres", category: "Entertainment" },
  { match: /\bSTEAM\b|STEAMGAMES/, name: "Steam", category: "Entertainment" },
  { match: /NINTENDO/, name: "Nintendo", category: "Entertainment" },
  { match: /PLAYSTATION/, name: "PlayStation", category: "Entertainment" },

  // ---- shopping ----
  { match: /SHOPEE/, name: "Shopee", category: "Shopping" },
  { match: /LAZADA/, name: "Lazada", category: "Shopping" },
  { match: /AMAZON|AMZN/, name: "Amazon", category: "Shopping" },
  { match: /TAOBAO/, name: "Taobao", category: "Shopping" },
  { match: /QOO10/, name: "Qoo10", category: "Shopping" },
  { match: /\bIKEA\b/, name: "IKEA", category: "Shopping" },
  { match: /UNIQLO/, name: "Uniqlo", category: "Shopping" },
  { match: /DECATHLON/, name: "Decathlon", category: "Shopping" },
  { match: /WATSONS/, name: "Watsons", category: "Shopping" },
  { match: /GUARDIAN/, name: "Guardian", category: "Shopping" },
  { match: /MUSTAFA/, name: "Mustafa Centre", category: "Shopping" },
  { match: /COURTS/, name: "Courts", category: "Shopping" },
  { match: /HARVEY\s*NORMAN/, name: "Harvey Norman", category: "Shopping" },
  { match: /CHALLENGER/, name: "Challenger", category: "Shopping" },
  { match: /POPULAR\s*BOOK|\bPOPULAR\b/, name: "Popular", category: "Shopping" },
  { match: /\bDAISO\b/, name: "Daiso", category: "Shopping" },

  // ---- travel ----
  { match: /AGODA/, name: "Agoda", category: "Travel" },
  { match: /BOOKING\.COM/, name: "Booking.com", category: "Travel" },
  { match: /AIRBNB/, name: "Airbnb", category: "Travel" },
  { match: /TRIP\.COM/, name: "Trip.com", category: "Travel" },
  { match: /EXPEDIA/, name: "Expedia", category: "Travel" },
  { match: /SINGAPORE\s*AIR|\bSIA\b(?!\s*ENGINEERING)/, name: "Singapore Airlines", category: "Travel" },
  { match: /\bSCOOT\b/, name: "Scoot", category: "Travel" },
  { match: /JETSTAR/, name: "Jetstar", category: "Travel" },
  { match: /AIRASIA|AIR\s*ASIA/, name: "AirAsia", category: "Travel" },
  { match: /CATHAY\s*PACIFIC/, name: "Cathay Pacific", category: "Travel" },
  { match: /KLOOK/, name: "Klook", category: "Travel" },
  { match: /TRAVELOKA/, name: "Traveloka", category: "Travel" },
];

const GIRO_RE = /\bGIRO\b/;

/**
 * Resolve a raw bank string to a known SG merchant/biller. Returns null when
 * nothing in the dictionary matches — callers keep the raw string.
 */
export function resolveMerchant(raw: string | null | undefined): MerchantMatch | null {
  if (!raw) return null;
  const text = raw.toUpperCase();
  const isGiro = GIRO_RE.test(text);
  for (const rule of RULES) {
    if (rule.match.test(text)) {
      return { name: rule.name, category: rule.category, biller: !!rule.biller || isGiro };
    }
  }
  return null;
}

/**
 * Display name for a transaction note: the resolved merchant when known,
 * otherwise the raw note untouched.
 */
export function displayName(note: string | null | undefined): string | null {
  return resolveMerchant(note)?.name ?? note ?? null;
}
