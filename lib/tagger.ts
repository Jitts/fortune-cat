/**
 * Rule-based category tagger (v1). No LLM — matches keywords in a transaction's
 * free-text note against the system categories. Writes into the same
 * ai_category* fields the schema reserves for auto-tagging, with source
 * "rules:v1" so the origin is transparent. An LLM can be swapped in later
 * behind this same interface.
 */

export const TAG_SOURCE = "rules:v1";

// System category names (must match the seeded `categories.name` values).
export type CategoryName =
  | "Food & Drink"
  | "Transport"
  | "Shopping"
  | "Salary"
  | "Utilities"
  | "Entertainment";

const KEYWORDS: Record<CategoryName, string[]> = {
  "Food & Drink": [
    "coffee", "cafe", "café", "lunch", "dinner", "breakfast", "brunch", "restaurant",
    "food", "meal", "eat", "drink", "drinks", "bar", "pub", "pizza", "burger", "sushi",
    "grocery", "groceries", "snack", "takeout", "doordash", "ubereats", "starbucks",
    "mcdonald", "chipotle", "deli", "bakery", "tea", "beer", "wine",
  ],
  Transport: [
    "uber", "lyft", "taxi", "cab", "transit", "bus", "train", "subway", "metro", "gas",
    "fuel", "petrol", "parking", "flight", "airline", "airport", "ride", "toll", "bike",
    "scooter", "commute", "fare",
  ],
  Shopping: [
    "amazon", "amzn", "store", "mall", "clothes", "clothing", "shoes", "apparel", "order",
    "shop", "target", "walmart", "ikea", "purchase", "electronics", "headphones", "gadget",
    "jacket", "shirt",
  ],
  Salary: [
    "salary", "paycheck", "payroll", "wage", "wages", "income", "bonus", "reimbursement",
    "refund", "freelance", "invoice", "payout", "dividend",
  ],
  Utilities: [
    "electric", "electricity", "water", "internet", "wifi", "utility", "utilities", "rent",
    "cable", "heating", "sewage", "trash", "broadband", "phone bill", "mortgage",
  ],
  Entertainment: [
    "movie", "cinema", "netflix", "spotify", "hulu", "disney", "game", "gaming", "concert",
    "streaming", "subscription", "theater", "theatre", "show", "festival", "kindle", "book",
    "arcade",
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
  const text = (note ?? "").toLowerCase().trim();

  let best: { category: CategoryName; hits: number } | null = null;
  if (text) {
    for (const category of Object.keys(KEYWORDS) as CategoryName[]) {
      let hits = 0;
      for (const kw of KEYWORDS[category]) {
        const re = new RegExp(`\\b${escapeRegExp(kw.toLowerCase())}\\b`);
        if (re.test(text)) hits += 1;
      }
      if (hits > 0 && (!best || hits > best.hits)) {
        best = { category, hits };
      }
    }
  }

  if (!best) {
    // No keyword signal: income is almost always salary-like; expenses stay untagged.
    if (type === "income") return { category: "Salary", confidence: 0.7 };
    return null;
  }

  const confidence = best.hits >= 3 ? 0.94 : best.hits === 2 ? 0.86 : 0.72;
  return { category: best.category, confidence };
}
