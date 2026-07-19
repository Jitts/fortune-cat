/**
 * Instant paint while /settings streams — without this, clicking the gear
 * feels dead until every query finishes.
 */
export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-surface-2 px-6 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="h-9 w-64 animate-pulse rounded-xl bg-surface-3" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}
