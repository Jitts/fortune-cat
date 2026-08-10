/**
 * Rule-based category tagger (v2). No LLM — first consults the SG merchant
 * dictionary (lib/merchants.ts) for an exact merchant hit, then falls back to
 * keyword matching against the system categories. Writes into the same
 * ai_category* fields the schema reserves for auto-tagging, with source
 * "rules:v2" so the origin is transparent. An LLM can be swapped in later
 * behind this same interface.
 */
import { resolveMerchant } from "@/lib/merchants";

export const TAG_SOURCE = "rules:v2";

// System category names (must match the seeded `categories.name` values).
//
// All thirteen, matching migration 0024. Six of them — Groceries, Housing,
// Insurance, Education, Gifts & Donations, Online Shopping — were seeded there
// and never added here, so nothing could ever be auto-filed into them however
// plainly it said so. An insurance premium reading "for insurance policy
// ending 9193" had no category to land in, and groceries, rent and Shopee
// orders were all being collapsed into their nearest general neighbour.
export type CategoryName =
  | "Food & Drink"
  | "Groceries"
  | "Transport"
  | "Shopping"
  | "Online Shopping"
  | "Salary"
  | "Utilities"
  | "Housing"
  | "Insurance"
  | "Education"
  | "Gifts & Donations"
  | "Entertainment"
  | "Travel";

/**
 * Specificity order, most specific first. Used only to break ties.
 *
 * Adding narrower categories alongside broader ones creates overlaps that the
 * hit count alone can't settle: "grocery run at the supermarket" scores once
 * for Groceries and once for Food & Drink, and without this the winner would
 * be whichever key happened to be declared first — a silent dependency on
 * object literal order. The narrower category is the more useful answer when
 * both fit, so it is named explicitly rather than left to chance.
 */
const SPECIFICITY: CategoryName[] = [
  "Insurance",
  "Education",
  "Gifts & Donations",
  "Groceries",
  "Online Shopping",
  "Housing",
  "Travel",
  "Transport",
  "Entertainment",
  "Utilities",
  "Food & Drink",
  "Shopping",
  "Salary",
];

const KEYWORDS: Record<CategoryName, string[]> = {
  "Food & Drink": [
    "coffee", "cafe", "café", "lunch", "dinner", "breakfast", "brunch", "restaurant",
    "food", "meal", "eat", "drink", "drinks", "bar", "pub", "pizza", "burger", "sushi",
    "snack", "takeout", "doordash", "ubereats", "starbucks",
    "mcdonald", "chipotle", "deli", "bakery", "tea", "beer", "wine",
    "grabfood", "foodpanda", "kopitiam", "hawker",
  ],
  // Split out of Food & Drink: a weekly supermarket shop and a restaurant
  // dinner are different enough that lumping them together makes the food
  // total useless for anyone trying to see where the money actually goes.
  Groceries: [
    "grocery", "groceries", "supermarket", "fairprice", "ntuc", "cold storage",
    "giant", "sheng siong", "prime supermarket", "redmart", "tesco", "aldi",
    "lidl", "sainsbury", "costco", "trader joe",
  ],
  Transport: [
    "uber", "lyft", "taxi", "cab", "transit", "bus", "train", "subway", "metro", "gas",
    "fuel", "petrol", "parking", "flight", "airline", "airport", "ride", "toll", "bike",
    "scooter", "commute", "fare", "grab", "gojek", "ez-link", "ezlink",
  ],
  Shopping: [
    "store", "mall", "clothes", "clothing", "shoes", "apparel", "order",
    "shop", "target", "walmart", "ikea", "purchase", "electronics", "headphones", "gadget",
    "jacket", "shirt", "uniqlo", "decathlon",
  ],
  // The marketplaces, split from bricks-and-mortar shopping.
  "Online Shopping": [
    "amazon", "amzn", "lazada", "shopee", "taobao", "aliexpress", "ebay", "etsy",
    "qoo10", "zalora", "asos", "shein", "temu",
  ],
  Salary: [
    "salary", "paycheck", "payroll", "wage", "wages", "bonus", "reimbursement",
    "freelance", "payout", "dividend", "cpf contribution",
  ],
  Utilities: [
    "electric", "electricity", "water bill", "internet", "wifi", "utility", "utilities",
    "cable", "heating", "sewage", "trash", "broadband", "phone bill", "mobile bill",
    "sp services", "singtel", "starhub", "m1",
  ],
  // Split from Utilities, where "rent" and "mortgage" used to live — the two
  // largest recurring costs most people have were filed under the same heading
  // as a phone bill.
  Housing: [
    "rent", "rental", "mortgage", "landlord", "tenancy", "lease", "housing loan",
    "hdb", "property tax", "condo", "maintenance fee", "town council",
  ],
  // The category the Manulife premium needed and could not reach.
  Insurance: [
    "insurance", "insurer", "premium", "policy", "coverage", "assurance",
    "manulife", "prudential", "aia", "great eastern", "ntuc income", "axa",
    "allianz", "fwd", "singlife", "aviva",
  ],
  Education: [
    "tuition", "school fee", "school fees", "course", "textbook", "university",
    "college", "enrolment", "enrollment", "semester", "exam fee", "udemy",
    "coursera", "workshop", "seminar", "training",
  ],
  "Gifts & Donations": [
    "donation", "donate", "charity", "gift", "present", "fundraiser", "giving",
    "zakat", "tithe", "ang bao", "angbao", "red packet", "wedding gift",
  ],
  Entertainment: [
    "movie", "cinema", "netflix", "spotify", "hulu", "disney", "game", "gaming", "concert",
    "streaming", "subscription", "theater", "theatre", "show", "festival", "kindle", "book",
    "arcade",
  ],
  Travel: [
    "hotel", "resort", "hostel", "motel", "guesthouse", "inn", "lodging", "accommodation",
    "staycation", "agoda", "booking.com", "airbnb", "ascott", "somerset", "citadines",
  ],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type TagSuggestion = {
  category: CategoryName;
  confidence: number; // 0–1
};

/**
 * Suggest a category from a transaction note (and type). Returns null when
 * there's no confident signal for an expense; income falls back to Salary.
 */
export function suggestCategory(
  note: string | null | undefined,
  type: "expense" | "income",
): TagSuggestion | null {
  // A known SG merchant is the strongest signal we have.
  const merchant = resolveMerchant(note);
  if (merchant?.category) return { category: merchant.category, confidence: 0.95 };

  const text = (note ?? "").toLowerCase().trim();

  let best: { category: CategoryName; hits: number; rank: number } | null = null;
  if (text) {
    // Iterate in specificity order so `rank` is meaningful, and so a tie can
    // never be decided by where a key happens to sit in the literal above.
    for (const [rank, category] of SPECIFICITY.entries()) {
      let hits = 0;
      for (const kw of KEYWORDS[category]) {
        const re = new RegExp(`\\b${escapeRegExp(kw.toLowerCase())}\\b`);
        if (re.test(text)) hits += 1;
      }
      if (hits === 0) continue;
      // More evidence wins outright; equal evidence goes to the narrower
      // category, which says more about the spending than its parent does.
      if (!best || hits > best.hits || (hits === best.hits && rank < best.rank)) {
        best = { category, hits, rank };
      }
    }
  }

  if (!best) {
    // Nothing recognised. Both directions now stay untagged.
    //
    // Income used to fall back to "Salary" on the reasoning that income
    // usually is. It isn't: an insurance payout, a refund, a transfer from a
    // friend and a rebate are all income, and every one of them was being
    // filed as Salary with 0.7 confidence — a number that implies evidence
    // where there was none. Worse, it auto-posted, so nobody ever saw the
    // claim to correct it.
    //
    // Real salary says so ("salary", "payroll", "wage" are all keywords), so
    // that case still matches above. Leaving the rest uncategorised is the
    // honest answer, and an uncategorised row asks to be looked at.
    return null;
  }

  const confidence = best.hits >= 3 ? 0.94 : best.hits === 2 ? 0.86 : 0.72;
  return { category: best.category, confidence };
}
