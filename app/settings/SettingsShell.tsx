"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AppChrome from "@/app/components/AppChrome";
import AccountShell from "@/app/account/AccountShell";
import FeedbackShell from "@/app/feedback/FeedbackShell";
import CaptureSettings from "./components/CaptureSettings";
import type { Category, EmailConnection, FeatureRequest, SmsTokenInfo, Transaction, TrustedSender } from "@/lib/types";

type SettingsTab = "capture" | "account" | "feedback";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "capture", label: "📡 Capture" },
  { id: "account", label: "👤 Account & Privacy" },
  { id: "feedback", label: "💡 Feedback" },
];

/**
 * /settings is one page with three tabs: Capture (email/SMS/statement
 * intake), Account & Privacy (profile, appearance, export, delete), and
 * Feedback (feature requests) — kept as separate components/actions under
 * the hood, just presented as one place. Tab is URL-driven (?tab=) so it
 * deep-links, mirroring the dashboard's tabs.
 */
export default function SettingsShell({
  initialConnections,
  initialTrustedSenders,
  initialSmsToken,
  pendingReviewCount,
  userEmail,
  isPro,
  msOAuthAvailable,
  transactions,
  categories,
  initialRequests,
}: {
  initialConnections: EmailConnection[];
  initialTrustedSenders: TrustedSender[];
  initialSmsToken: SmsTokenInfo | null;
  pendingReviewCount: number;
  userEmail: string;
  isPro: boolean;
  msOAuthAvailable: boolean;
  transactions: Transaction[];
  categories: Category[];
  initialRequests: FeatureRequest[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const active: SettingsTab =
    tabParam === "account" ? "account" : tabParam === "feedback" ? "feedback" : "capture";

  function setTab(t: SettingsTab) {
    router.replace(t === "capture" ? "/settings" : `/settings?tab=${t}`, { scroll: false });
  }

  return (
    <AppChrome userEmail={userEmail} isPro={isPro} pendingReviewCount={pendingReviewCount}>
      <div className="mb-2 inline-flex rounded-xl border border-line p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              active === t.id ? "bg-action text-white" : "text-ink-muted hover:bg-surface-3"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {active === "capture" && (
          <CaptureSettings
            initialConnections={initialConnections}
            initialTrustedSenders={initialTrustedSenders}
            initialSmsToken={initialSmsToken}
            isPro={isPro}
            msOAuthAvailable={msOAuthAvailable}
          />
        )}
        {active === "account" && (
          <AccountShell userEmail={userEmail} isPro={isPro} transactions={transactions} categories={categories} />
        )}
        {active === "feedback" && <FeedbackShell initialRequests={initialRequests} />}
      </div>
    </AppChrome>
  );
}
