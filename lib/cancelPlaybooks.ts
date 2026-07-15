/**
 * Cancel playbooks (static data, no PII) — the "kill" half of the subscription
 * kill-chain. Keyed by the exact merchant names lib/merchants.ts emits, so a
 * detected recurring charge maps straight to how to end it. Membership in this
 * dictionary is also what MARKS a recurring biller as a cancellable
 * subscription (vs an un-cancellable utility like SP Services or PUB).
 */

export type CancelPlaybook = {
  url: string; // where the cancel/manage flow lives
  steps: string[]; // short, ordered, SG-flavoured
  note?: string; // caveat worth knowing before you cancel
};

const PLAYBOOKS: Record<string, CancelPlaybook> = {
  Netflix: {
    url: "https://www.netflix.com/cancelplan",
    steps: [
      "Sign in at netflix.com on a browser (not the app).",
      "Account → Membership → Cancel Membership.",
      "You keep access until the current billing date.",
    ],
  },
  Spotify: {
    url: "https://www.spotify.com/account/subscription/",
    steps: [
      "Go to spotify.com → Account → Your plan.",
      "Change plan → Cancel Premium.",
      "Premium runs until the period ends, then drops to Free.",
    ],
    note: "Cancelling in the iOS app isn't possible if you subscribed via Apple — cancel in Apple instead.",
  },
  "Disney+": {
    url: "https://www.disneyplus.com/account/subscription",
    steps: [
      "Sign in at disneyplus.com → Account.",
      "Under Subscription, select your plan → Cancel Subscription.",
    ],
  },
  "YouTube Premium": {
    url: "https://www.youtube.com/paid_memberships",
    steps: [
      "Go to youtube.com/paid_memberships (signed in).",
      "Manage membership → Deactivate → Continue to cancel.",
    ],
  },
  "Apple services": {
    url: "https://apps.apple.com/account/subscriptions",
    steps: [
      "On iPhone: Settings → your name → Subscriptions.",
      "Tap the subscription → Cancel Subscription.",
    ],
    note: "Many 'Apple services' charges are third-party subs billed through Apple — cancel them here, not with the vendor.",
  },
  "iCloud+": {
    url: "https://support.apple.com/en-sg/HT207594",
    steps: [
      "Settings → your name → iCloud → Manage Account Storage.",
      "Change Storage Plan → Downgrade Options → pick the free 5GB.",
    ],
    note: "Free up space first — downgrading below your usage can stop new backups.",
  },
  Singtel: {
    url: "https://www.singtel.com/personal/support",
    steps: [
      "Check your contract end date in the My Singtel app first.",
      "Chat/hotline to terminate; early exit may carry a penalty.",
      "Port-out to another telco auto-terminates the line.",
    ],
    note: "In-contract termination usually has an early-termination charge.",
  },
  StarHub: {
    url: "https://www.starhub.com/personal/support.html",
    steps: [
      "Confirm your contract end date in the My StarHub app.",
      "Request termination via hotline or a StarHub shop.",
    ],
    note: "Early termination within the contract carries a fee.",
  },
  M1: {
    url: "https://www.m1.com.sg/support",
    steps: [
      "Check contract status in the My M1 app.",
      "Terminate via hotline or an M1 shop.",
    ],
    note: "Early termination within the contract carries a fee.",
  },
  "Circles.Life": {
    url: "https://www.circles.life/sg/",
    steps: [
      "Circles.Life is no-contract — manage in the app.",
      "Account → Manage plan → Terminate line.",
    ],
  },
  Simba: {
    url: "https://www.simba.sg/",
    steps: [
      "Simba (ex-TPG) plans are no-contract — manage in the app.",
      "Account → Cancel plan.",
    ],
  },
  MyRepublic: {
    url: "https://myrepublic.net/sg/",
    steps: ["Check contract end date.", "Submit a termination request via the portal or hotline."],
    note: "Broadband contracts often need ~30 days' notice.",
  },
  ViewQwest: {
    url: "https://viewqwest.com/",
    steps: ["Check contract end date.", "Submit termination via support; give notice period."],
    note: "Broadband contracts often need ~30 days' notice.",
  },
  AIA: {
    url: "https://www.aia.com.sg/en/contact-us",
    steps: [
      "Don't cancel insurance impulsively — check surrender value and cover loss first.",
      "Speak to your adviser or AIA before stopping the GIRO.",
    ],
    note: "Lapsing a policy can forfeit value and cover — review before acting.",
  },
  Prudential: {
    url: "https://www.prudential.com.sg/contact-us",
    steps: [
      "Review surrender value and what cover you'd lose.",
      "Contact your adviser or Prudential before stopping payment.",
    ],
    note: "Lapsing a policy can forfeit value and cover — review before acting.",
  },
  "Great Eastern": {
    url: "https://www.greateasternlife.com/sg/en/contact-us.html",
    steps: [
      "Review surrender value and cover loss.",
      "Contact your adviser or Great Eastern before stopping payment.",
    ],
    note: "Lapsing a policy can forfeit value and cover — review before acting.",
  },
  "Income Insurance": {
    url: "https://www.income.com.sg/contact-us",
    steps: [
      "Review surrender value and cover loss.",
      "Contact Income before stopping the premium.",
    ],
    note: "Lapsing a policy can forfeit value and cover — review before acting.",
  },
  Singlife: {
    url: "https://singlife.com/en/contact-us",
    steps: [
      "Review value and cover in the Singlife app.",
      "Contact Singlife before stopping payment.",
    ],
    note: "Lapsing a policy can forfeit value and cover — review before acting.",
  },
};

const GENERIC: CancelPlaybook = {
  url: "",
  steps: [
    "Open the vendor's website or app and go to Account → Billing/Subscription.",
    "Look for Manage plan → Cancel.",
    "Note the date access ends — most run to the end of the paid period.",
  ],
  note: "If it's billed through Apple or Google, cancel in that store's Subscriptions instead.",
};

/** True when this merchant name is a cancellable subscription (has a playbook). */
export function isSubscriptionMerchant(name: string): boolean {
  return name in PLAYBOOKS;
}

/** Specific playbook when known, else a safe generic one. */
export function getPlaybook(name: string): CancelPlaybook {
  return PLAYBOOKS[name] ?? GENERIC;
}
