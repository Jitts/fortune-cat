// Per-tier cap on how many inboxes a user can connect for auto-scan. Free gets
// one; Pro unlocks up to three. Kept in one place so the server action and the
// Capture UI enforce the exact same numbers.
export const FREE_INBOX_LIMIT = 1;
export const PRO_INBOX_LIMIT = 3;

export function inboxLimit(isPro: boolean): number {
  return isPro ? PRO_INBOX_LIMIT : FREE_INBOX_LIMIT;
}
