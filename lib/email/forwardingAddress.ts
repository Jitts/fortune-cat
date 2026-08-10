/**
 * Builds the address a person forwards their receipts to.
 *
 * One inbound mailbox serves everybody and the per-user part rides in the
 * "+tag", so `abc123@cloudmailin.net` becomes `abc123+<token>@cloudmailin.net`.
 * That is what lets forwarding ship before a custom domain is bought: the
 * routing, the token and the parsing are identical either way, and moving to
 * `<token>@in.fortunecat.app` later changes only this function.
 *
 * Server-only — reads the env var naming the shared mailbox.
 */
export function forwardingAddressFor(token: string): string | null {
  const base = (process.env.FORWARDING_INBOX ?? "").trim();
  if (!base || !token) return null;
  const at = base.lastIndexOf("@");
  if (at <= 0) return null;
  const local = base.slice(0, at);
  const domain = base.slice(at + 1);
  if (!local || !domain) return null;
  return `${local}+${token}@${domain}`;
}

/** Whether forwarding is configured at all — drives whether the UI offers it. */
export function forwardingConfigured(): boolean {
  return Boolean((process.env.FORWARDING_INBOX ?? "").trim() && process.env.CLOUDMAILIN_WEBHOOK_SECRET);
}
