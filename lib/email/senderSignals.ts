import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The anonymous collaborative-filter layer on top of blocked_senders/
 * trusted_senders (migration 0022) and their global aggregates, sender_signals
 * and trust_signals (migration 0025). Two things live here:
 *
 * - block-signal graduation: once enough DISTINCT users have blocked the same
 *   domain, it's treated as globally unwanted for everyone — new captures
 *   from it land in a visible, undoable "Filtered" status instead of the
 *   normal review queue. Never a silent drop.
 * - trust-signal accumulation (write side only, for now): the reverse tally,
 *   seeding future regional bank/merchant recognition once there's enough
 *   real per-country signal to bootstrap from.
 *
 * Domain extraction, the freemail exclusion, and the known-sender allow-list
 * are shared so the semantics can never drift between the write side
 * (blockSender/trustSender in app/settings/actions.ts) and the read side
 * (processFetchedEmails in lib/email/processScan.ts).
 */

// A domain graduates once this many DISTINCT users have blocked it.
// Deliberately low for now — revisit once there's a real user base large
// enough for a threshold to mean something.
export const GRADUATION_THRESHOLD = 3;

// Freemail domains never contribute to either anonymous aggregate — one
// person blocking or trusting a personal contact must not nudge a shared
// domain's score.
export const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "msn.com", "yahoo.com", "yahoo.com.sg", "ymail.com", "icloud.com", "me.com",
  "mac.com", "proton.me", "protonmail.com", "pm.me", "aol.com", "gmx.com",
  "zoho.com", "mail.com", "qq.com", "163.com", "126.com", "naver.com",
]);

// Known bank / payment / major biller domains, across the regions this app
// supports (lib/regions.ts). A coordinated pile-on (or an honest mass-block
// during a phishing scare that spoofs a real bank's name) can never graduate
// one of these into the global filter — poisoning defense. Not exhaustive;
// safe to extend, since being absent just means "no extra protection", not
// "cannot be blocked" (every user can still block it for themselves).
export const KNOWN_SENDER_DOMAINS = new Set([
  // Singapore
  "dbs.com.sg", "dbs.com", "posb.com.sg", "ocbc.com", "uobgroup.com", "uob.com.sg",
  "standardchartered.com.sg", "hsbc.com.sg", "citibank.com.sg", "maybank2u.com.sg",
  "gxs.com.sg", "trustbank.com.sg", "spgroup.com.sg", "singtel.com", "starhub.com", "m1.com.sg",
  // Malaysia
  "maybank2u.com.my", "cimbclicks.com.my", "publicbank.com.my", "rhbgroup.com",
  "hongleongconnect.my", "bankislam.com.my",
  // Indonesia
  "bca.co.id", "bri.co.id", "mandiri.co.id", "bni.co.id", "cimbniaga.co.id",
  // Thailand
  "scb.co.th", "kasikornbank.com", "bangkokbank.com", "ktb.co.th",
  // Philippines
  "bdo.com.ph", "bpi.com.ph", "metrobank.com.ph", "unionbankph.com",
  // Vietnam
  "vietcombank.com.vn", "techcombank.com.vn", "vietinbank.vn", "bidv.com.vn",
  // Hong Kong
  "hsbc.com.hk", "hangseng.com", "bochk.com", "standardchartered.com.hk",
  // Australia / NZ
  "commbank.com.au", "nab.com.au", "westpac.com.au", "anz.com.au", "anz.com",
  "anz.co.nz", "asb.co.nz", "westpac.co.nz", "bnz.co.nz",
  // UAE / Saudi
  "emiratesnbd.com", "adcb.com", "mashreqbank.com", "alrajhibank.com.sa", "ncb.com",
  // Brazil / Mexico
  "bb.com.br", "itau.com.br", "bradesco.com.br", "nubank.com.br", "santander.com.br",
  "bbva.mx", "banamex.com", "santander.com.mx", "banorte.com",
  // Canada
  "rbc.com", "td.com", "scotiabank.com", "bmo.com", "cibc.com",
  // China
  "icbc.com.cn", "ccb.com", "boc.cn", "abchina.com", "alipay.com", "wechat.com",
  // Europe
  "deutsche-bank.de", "commerzbank.de", "ing.de", "sparkasse.de", "n26.com",
  "danskebank.dk", "nordea.dk", "nordea.se", "nordea.no",
  "bbva.es", "santander.es", "caixabank.es",
  "bnpparibas.fr", "societegenerale.fr", "creditagricole.fr", "labanquepostale.fr",
  "barclays.co.uk", "hsbc.co.uk", "lloydsbank.co.uk", "natwest.com", "monzo.com",
  "starlingbank.com", "santander.co.uk", "revolut.com", "wise.com",
  "aib.ie", "bankofireland.com", "permanenttsb.ie",
  "intesasanpaolo.com", "unicredit.it",
  "ing.nl", "abnamro.nl", "rabobank.nl",
  "millenniumbcp.pt", "cgd.pt",
  "swedbank.se", "seb.se",
  "ubs.com", "credit-suisse.com", "postfinance.ch",
  // India
  "hdfcbank.com", "icicibank.com", "sbi.co.in", "axisbank.com", "paytm.com", "phonepe.com",
  // Japan / Korea / Taiwan
  "mufg.jp", "smbc.co.jp", "mizuhobank.co.jp", "japanpost.jp",
  "kbstar.com", "shinhan.com", "wooribank.com", "kakaobank.com",
  "bot.com.tw", "ctbcbank.com",
  // United States
  "chase.com", "bankofamerica.com", "wellsfargo.com", "citibank.com", "capitalone.com",
  "usbank.com", "americanexpress.com", "venmo.com",
  // South Africa
  "standardbank.co.za", "fnb.co.za", "absa.co.za", "nedbank.co.za",
  // Global payment / commerce
  "paypal.com", "stripe.com", "visa.com", "mastercard.com", "apple.com", "google.com",
  "amazon.com", "grab.com", "gojek.com", "shopeepay.com",
]);

/** Pulls the domain out of a "Name <user@domain>" or bare "user@domain" sender. */
export function extractSenderDomain(fromAddress: string): string | null {
  const match = fromAddress.toLowerCase().match(/@([a-z0-9.-]+)/);
  const domain = match?.[1]?.trim();
  return domain && domain.length >= 3 ? domain : null;
}

/**
 * Anonymous (domain, country) block tally — service-role write, no user ids.
 * Best-effort: a signal failure never fails the user's block/unblock.
 */
export async function bumpSenderSignal(domain: string, country: string, delta: 1 | -1) {
  if (FREEMAIL_DOMAINS.has(domain) || !domain.includes(".")) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sender_signals")
      .select("block_count")
      .eq("domain", domain)
      .eq("country", country)
      .maybeSingle();
    // ponytail: read-modify-write race under concurrent blocks; swap for an
    // atomic RPC if signal volume ever matters.
    await admin.from("sender_signals").upsert(
      {
        domain,
        country,
        block_count: Math.max(0, (data?.block_count ?? 0) + delta),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "domain,country" },
    );
  } catch (err) {
    console.error("[bumpSenderSignal]", err);
  }
}

/** The mirror of bumpSenderSignal for the reverse (trust) aggregate. */
export async function bumpTrustSignal(domain: string, country: string, delta: 1 | -1) {
  if (FREEMAIL_DOMAINS.has(domain) || !domain.includes(".")) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("trust_signals")
      .select("trust_count")
      .eq("domain", domain)
      .eq("country", country)
      .maybeSingle();
    await admin.from("trust_signals").upsert(
      {
        domain,
        country,
        trust_count: Math.max(0, (data?.trust_count ?? 0) + delta),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "domain,country" },
    );
  } catch (err) {
    console.error("[bumpTrustSignal]", err);
  }
}

/**
 * Domains that have graduated the collaborative filter: blocked by at least
 * GRADUATION_THRESHOLD distinct users, summed across every country row (a
 * scam sender isn't regional), minus the known-sender allow-list. Best-effort
 * — a missing table (pre-migration 0025) or a read error degrades to "nothing
 * graduated" so scans are never blocked by this.
 */
export async function getGraduatedDomains(): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("sender_signals").select("domain, block_count");
    if (error || !data) return totals;
    for (const row of data as { domain: string; block_count: number }[]) {
      totals.set(row.domain, (totals.get(row.domain) ?? 0) + row.block_count);
    }
    for (const [domain, count] of totals) {
      if (count < GRADUATION_THRESHOLD || KNOWN_SENDER_DOMAINS.has(domain)) totals.delete(domain);
    }
  } catch (err) {
    console.error("[getGraduatedDomains]", err);
    return new Map();
  }
  return totals;
}
