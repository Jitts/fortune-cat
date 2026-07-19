/** Instant paint while the dashboard's data streams in — mirrors the 3-column shrine layout. */
export default function Loading() {
  return (
    <main className="min-h-screen bg-surface-2 px-6 py-10">
      <div className="mx-auto grid w-full max-w-[1200px] animate-pulse gap-6 lg:grid-cols-[270px_minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <div className="h-72 rounded-2xl bg-surface-3" />
          <div className="h-40 rounded-2xl bg-surface-3" />
        </div>
        <div className="space-y-6">
          <div className="h-9 w-40 rounded-xl bg-surface-3" />
          <div className="h-96 rounded-2xl bg-surface-3" />
        </div>
        <div className="space-y-6">
          <div className="h-48 rounded-2xl bg-surface-3" />
          <div className="h-40 rounded-2xl bg-surface-3" />
        </div>
      </div>
    </main>
  );
}
