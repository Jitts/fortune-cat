// Step-by-step app-password guides per provider, keyed by email domain.
// Client-safe (no Node-only imports) so ConnectEmailForm can import it directly.
export type AppPasswordGuide = {
  provider: string;
  steps: string[];
  url: string;
  urlLabel: string;
};

const GMAIL_GUIDE: AppPasswordGuide = {
  provider: "Gmail",
  steps: [
    'Go to your Google Account → Security',
    "Make sure 2-Step Verification is turned on (required before app passwords are available)",
    'Search for "App passwords" in your Google Account settings, or go directly to the link below',
    'Create one — name it something like "Fortune Cat"; Google will generate a 16-character password',
    'Come back here and paste that 16-character password into the "App password" field below instead of your regular Gmail password',
  ],
  url: "https://myaccount.google.com/apppasswords",
  urlLabel: "myaccount.google.com/apppasswords",
};

const MICROSOFT_GUIDE: AppPasswordGuide = {
  provider: "Outlook/Hotmail",
  steps: [
    'Heads up: Microsoft has switched off app-password IMAP for personal Outlook/Hotmail/Live accounts — a "AUTHENTICATE failed" error means exactly that. Use "Continue with Microsoft" if it\'s offered, or connect a Gmail, Yahoo, or iCloud inbox instead.',
    "If you still want to try: go to account.microsoft.com → Security → “Manage how I sign in” (Microsoft renamed the old “Advanced security options”)",
    "Make sure two-step verification is ON — app passwords only appear once it is",
    'Scroll to "App passwords" and choose "Create a new app password"',
    'Copy it and paste it into the "App password" field below instead of your regular password',
  ],
  url: "https://account.live.com/proofs/manage/additional",
  urlLabel: "Microsoft security options",
};

const YAHOO_GUIDE: AppPasswordGuide = {
  provider: "Yahoo",
  steps: [
    "Go to your Yahoo Account Security settings",
    "Turn on two-step verification if it isn't already on",
    'Click "Generate app password", choose "Other app", and name it "Fortune Cat"',
    'Copy the generated password and paste it into the "App password" field below instead of your regular password',
  ],
  url: "https://login.yahoo.com/account/security",
  urlLabel: "login.yahoo.com/account/security",
};

const ICLOUD_GUIDE: AppPasswordGuide = {
  provider: "iCloud",
  steps: [
    "Go to appleid.apple.com → Sign-In and Security",
    "Turn on two-factor authentication if it isn't already on",
    'Under "App-Specific Passwords", click "Generate an app-specific password"',
    'Copy the generated password and paste it into the "App password" field below instead of your regular Apple ID password',
  ],
  url: "https://appleid.apple.com",
  urlLabel: "appleid.apple.com",
};

export const APP_PASSWORD_GUIDES: Record<string, AppPasswordGuide> = {
  "gmail.com": GMAIL_GUIDE,
  "googlemail.com": GMAIL_GUIDE,
  "outlook.com": MICROSOFT_GUIDE,
  "hotmail.com": MICROSOFT_GUIDE,
  "live.com": MICROSOFT_GUIDE,
  "msn.com": MICROSOFT_GUIDE,
  "yahoo.com": YAHOO_GUIDE,
  "icloud.com": ICLOUD_GUIDE,
  "me.com": ICLOUD_GUIDE,
};

export const GENERIC_APP_PASSWORD_GUIDE: AppPasswordGuide = {
  provider: "your email provider",
  steps: [
    "Open your email provider's account security settings",
    "Turn on two-factor / two-step verification if it isn't already on (most providers require this before allowing app passwords)",
    'Look for a setting called "App passwords" or "App-specific passwords"',
    'Generate one and paste it into the "App password" field below instead of your regular password',
  ],
  url: "",
  urlLabel: "",
};

export function getAppPasswordGuide(email: string): AppPasswordGuide {
  const domain = email.split("@")[1]?.toLowerCase();
  return (domain && APP_PASSWORD_GUIDES[domain]) || GENERIC_APP_PASSWORD_GUIDE;
}
