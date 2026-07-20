import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display voice — a contemporary grotesque with a crafted, slightly irregular
// hand. Carries the wordmark, hero, and big figures; never UI labels.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
  weight: ["500", "600", "700", "800"],
});

// Workhorse — a warm humanist grotesque with excellent small-size legibility
// and tabular figures. Body, UI, labels, and most numbers.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hanken",
});

// The "machine capture" texture — SMS/receipt/provenance stamps and data
// labels. Diegetic (it *is* the forwarded message text), used sparingly.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fortune-cat-nu.vercel.app"),
  title: {
    default: "Fortune Cat — the money tracker that fills itself",
    template: "%s · Fortune Cat",
  },
  description:
    "Fortune Cat turns the SMS and emails your bank already sends into a live expense tracker — no bank login, it only ever sees the notification text you forward. Free to start, US$9 once for Pro, works in any currency worldwide.",
  applicationName: "Fortune Cat",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Fortune Cat",
    type: "website",
    locale: "en",
    url: "/",
    title: "Fortune Cat — the money tracker that fills itself",
    description:
      "Forward the SMS and emails your bank already sends and your ledger fills itself. No bank login, any currency, US$9 once for Pro.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fortune Cat — the money tracker that fills itself",
    description:
      "Forward the SMS and emails your bank already sends and your ledger fills itself. No bank login, any currency, US$9 once for Pro.",
  },
};

// Runs before first paint: applies the saved theme (or the time-of-day default)
// so there's no light-mode flash before React hydrates. Mirrors lib/theme.ts —
// keep the 7/19 boundary and the "fortune-theme" key in sync.
const NO_FLASH_THEME = `(function(){try{
  var p = localStorage.getItem('fortune-theme');
  var h = new Date().getHours();
  var dark = p === 'dark' || ((p === 'auto' || !p) && (h < 7 || h >= 19));
  document.documentElement.classList.toggle('dark', dark);
}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
