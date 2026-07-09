// Common providers' IMAP settings, keyed by email domain — used to prefill
// the connect form client-side. Kept in its own module (no imapflow/mailparser
// imports) so client components can use it without pulling Node-only IMAP
// internals into the browser bundle.
export const KNOWN_IMAP_HOSTS: Record<string, { host: string; port: number }> = {
  "gmail.com": { host: "imap.gmail.com", port: 993 },
  "googlemail.com": { host: "imap.gmail.com", port: 993 },
  "outlook.com": { host: "outlook.office365.com", port: 993 },
  "hotmail.com": { host: "outlook.office365.com", port: 993 },
  "live.com": { host: "outlook.office365.com", port: 993 },
  "msn.com": { host: "outlook.office365.com", port: 993 },
  "yahoo.com": { host: "imap.mail.yahoo.com", port: 993 },
  "icloud.com": { host: "imap.mail.me.com", port: 993 },
  "me.com": { host: "imap.mail.me.com", port: 993 },
};
